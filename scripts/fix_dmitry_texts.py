import json
import sqlite3
from pathlib import Path

DB = Path(__file__).resolve().parents[1] / "backend" / "lessgame.db"
PROJECT_ID = "b08ac347-350e-4350-b273-e2ba479f7486"

FIXES = {
    "field": "Против них — многочисленная орда Мамая: татары, половцы, наёмники. Солнце встало над полем, и ветер принёс запах пыли и коней.",
    "duel_offer": "Великий князь! Дозволь мне и моему пану Ослябе бросить вызов ордынским богатырям. Пусть исход поединка предскажет судьбу битвы!",
    "duel": "Александр Пересвет сел на коня и ринулся на богатыря Челубея. Копья сломались, кони сбились — оба воина пали замертво. Но дух русского войска вспыхнул как огонь.",
    "flank": "Когда центр схлестнулся, из леса ударил «Тихий полк» князя Владимира Андреевича. Орда не выдержала двойного удара и дрогнула.",
    "victory": "Победа! Мамай бежал, оставив стан и сокровища. Сегодня Русь доказала: мы можем побеждать Орду в честном бою!",
    "epilogue": "Куликовская битва стала поворотом истории. Дмитрий Иванович получил прозвание Донской. Объединённая Русь сделала первый шаг к освобождению от ордынского ига — путь был долгим, но начало положено здесь, на Куликовом поле.",
}

conn = sqlite3.connect(DB)
cur = conn.cursor()
for label, text in FIXES.items():
    cur.execute("SELECT data FROM graph_nodes WHERE project_id=? AND label=?", (PROJECT_ID, label))
    row = cur.fetchone()
    if not row:
        continue
    data = json.loads(row[0])
    data["text"] = text
    cur.execute(
        "UPDATE graph_nodes SET data=? WHERE project_id=? AND label=?",
        (json.dumps(data, ensure_ascii=False), PROJECT_ID, label),
    )
conn.commit()
conn.close()
