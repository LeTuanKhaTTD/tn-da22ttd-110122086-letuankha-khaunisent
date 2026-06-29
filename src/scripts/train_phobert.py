"""Fine-tune PhoBERT sentiment model cho TikUniSent."""

from __future__ import annotations

import argparse
import json
import random
from collections import Counter
from datetime import datetime
from pathlib import Path

import torch
from torch.utils.data import DataLoader, Dataset
from transformers import AutoModelForSequenceClassification, AutoTokenizer

LABEL2ID = {"positive": 0, "neutral": 1, "negative": 2}
ID2LABEL = {value: key for key, value in LABEL2ID.items()}
SEED = 42


class CommentDataset(Dataset):
    def __init__(self, rows: list[dict], tokenizer, max_length: int) -> None:
        self.rows = rows
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self) -> int:
        return len(self.rows)

    def __getitem__(self, index: int) -> dict:
        row = self.rows[index]
        encoded = self.tokenizer(
            str(row["text"]),
            max_length=self.max_length,
            padding="max_length",
            truncation=True,
            return_tensors="pt",
        )
        item = {key: value.squeeze(0) for key, value in encoded.items()}
        item["labels"] = torch.tensor(LABEL2ID[row["sentiment"]], dtype=torch.long)
        return item


def load_rows(path: Path) -> list[dict]:
    raw = json.loads(path.read_text(encoding="utf-8-sig"))
    rows = raw.get("comments", raw) if isinstance(raw, dict) else raw
    cleaned: list[dict] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        text = str(row.get("text", "")).strip()
        sentiment = str(row.get("sentiment", "")).strip().lower()
        if text and sentiment in LABEL2ID:
            cleaned.append({"text": text, "sentiment": sentiment})
    return cleaned


def stratified_split(rows: list[dict]) -> tuple[list[dict], list[dict], list[dict]]:
    rng = random.Random(SEED)
    grouped: dict[str, list[dict]] = {label: [] for label in LABEL2ID}
    for row in rows:
        grouped[row["sentiment"]].append(row)

    train: list[dict] = []
    val: list[dict] = []
    test: list[dict] = []
    for items in grouped.values():
        rng.shuffle(items)
        train_end = round(len(items) * 0.70)
        val_end = train_end + round(len(items) * 0.15)
        train.extend(items[:train_end])
        val.extend(items[train_end:val_end])
        test.extend(items[val_end:])
    rng.shuffle(train)
    rng.shuffle(val)
    rng.shuffle(test)
    return train, val, test


def macro_f1(y_true: list[int], y_pred: list[int]) -> float:
    scores: list[float] = []
    for label_id in ID2LABEL:
        tp = sum(1 for t, p in zip(y_true, y_pred) if t == label_id and p == label_id)
        fp = sum(1 for t, p in zip(y_true, y_pred) if t != label_id and p == label_id)
        fn = sum(1 for t, p in zip(y_true, y_pred) if t == label_id and p != label_id)
        precision = tp / (tp + fp) if tp + fp else 0.0
        recall = tp / (tp + fn) if tp + fn else 0.0
        scores.append(2 * precision * recall / (precision + recall) if precision + recall else 0.0)
    return sum(scores) / len(scores)


def evaluate(model, loader: DataLoader, device: torch.device) -> dict:
    model.eval()
    y_true: list[int] = []
    y_pred: list[int] = []
    total_loss = 0.0
    with torch.no_grad():
        for batch in loader:
            batch = {key: value.to(device) for key, value in batch.items()}
            output = model(**batch)
            total_loss += float(output.loss.item())
            y_true.extend(batch["labels"].cpu().tolist())
            y_pred.extend(output.logits.argmax(dim=1).cpu().tolist())
    accuracy = sum(1 for t, p in zip(y_true, y_pred) if t == p) / len(y_true)
    return {
        "loss": total_loss / max(len(loader), 1),
        "accuracy": accuracy,
        "macro_f1": macro_f1(y_true, y_pred),
    }


def train(args: argparse.Namespace) -> None:
    random.seed(SEED)
    torch.manual_seed(SEED)
    rows = load_rows(Path(args.data))
    if len(rows) < 30:
        raise ValueError("Du lieu train qua it, can it nhat 30 mau hop le.")

    train_rows, val_rows, test_rows = stratified_split(rows)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    base_model_path = Path(args.base_model)
    tokenizer = AutoTokenizer.from_pretrained(str(base_model_path), local_files_only=True)
    model = AutoModelForSequenceClassification.from_pretrained(
        str(base_model_path),
        num_labels=len(LABEL2ID),
        id2label=ID2LABEL,
        label2id=LABEL2ID,
        local_files_only=True,
    ).to(device)

    train_loader = DataLoader(CommentDataset(train_rows, tokenizer, args.max_length), batch_size=args.batch_size, shuffle=True)
    val_loader = DataLoader(CommentDataset(val_rows, tokenizer, args.max_length), batch_size=args.batch_size)
    test_loader = DataLoader(CommentDataset(test_rows, tokenizer, args.max_length), batch_size=args.batch_size)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr)

    best_f1 = -1.0
    stale_epochs = 0
    best_state = None
    for epoch in range(1, args.epochs + 1):
        model.train()
        total_loss = 0.0
        for batch in train_loader:
            batch = {key: value.to(device) for key, value in batch.items()}
            optimizer.zero_grad()
            output = model(**batch)
            output.loss.backward()
            optimizer.step()
            total_loss += float(output.loss.item())

        val_metrics = evaluate(model, val_loader, device)
        print(
            f"epoch={epoch} train_loss={total_loss / len(train_loader):.4f} "
            f"val_acc={val_metrics['accuracy']:.4f} val_macro_f1={val_metrics['macro_f1']:.4f}"
        )
        if val_metrics["macro_f1"] > best_f1:
            best_f1 = val_metrics["macro_f1"]
            stale_epochs = 0
            best_state = {key: value.cpu().clone() for key, value in model.state_dict().items()}
        else:
            stale_epochs += 1
            if stale_epochs >= args.patience:
                break

    if best_state:
        model.load_state_dict(best_state)
    test_metrics = evaluate(model, test_loader, device)

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)
    metadata = {
        "model_name": "vinai/phobert-base",
        "continued_from": str(base_model_path).replace("\\", "/"),
        "fine_tuned_on": str(Path(args.data)).replace("\\", "/"),
        "trained_at": datetime.now().isoformat(timespec="seconds"),
        "train_size": len(train_rows),
        "val_size": len(val_rows),
        "test_size": len(test_rows),
        "label_map": LABEL2ID,
        "max_len": args.max_length,
        "epochs": args.epochs,
        "best_val_macro_f1": best_f1,
        "test_accuracy": test_metrics["accuracy"],
        "test_f1_macro": test_metrics["macro_f1"],
        "device": str(device),
        "label_distribution": dict(Counter(row["sentiment"] for row in rows)),
    }
    (output_dir / "training_metadata.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved model to {output_dir}")
    print(json.dumps(metadata, ensure_ascii=False, indent=2))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fine-tune PhoBERT cho TikUniSent")
    parser.add_argument("--data", default="data/export/retrain_manual_phobert_9976.json")
    parser.add_argument("--base-model", default="models/phobert-sentiment-final")
    parser.add_argument("--output-dir", default="models/phobert-sentiment-continued")
    parser.add_argument("--max-length", type=int, default=256)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--patience", type=int, default=3)
    parser.add_argument("--lr", type=float, default=2e-5)
    return parser.parse_args()


if __name__ == "__main__":
    train(parse_args())
