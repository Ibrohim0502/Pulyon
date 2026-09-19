import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const STORAGE_KEY = "pulyon_data_v1";

const EMPTY_DATA = {
  transactions: [],
  debts: [],
};

function safeParse(value) {
  try {
    const parsed = JSON.parse(value);
    if (
      parsed &&
      Array.isArray(parsed.transactions) &&
      Array.isArray(parsed.debts)
    ) {
      return parsed;
    }
  } catch {}
  return EMPTY_DATA;
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? safeParse(saved) : EMPTY_DATA;
  } catch {
    return EMPTY_DATA;
  }
}

function localDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function money(value) {
  return `${new Intl.NumberFormat("uz-UZ").format(
    Math.round(Number(value) || 0)
  )} so'm`;
}

function App() {
  const [data, setData] = useState(loadData);
  const [page, setPage] = useState("home");

  const save = (next) => {
    setData(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      alert("Ma'lumotni saqlashda xatolik yuz berdi.");
    }
  };

  const stats = useMemo(() => {
    const income = data.transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expense = data.transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const lent = data.debts
      .filter((d) => !d.repaid)
      .reduce((sum, d) => sum + Number(d.amount), 0);

    const today = localDate();

    const todayIncome = data.transactions
      .filter((t) => t.type === "income" && t.date === today)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const todayExpense = data.transactions
      .filter((t) => t.type === "expense" && t.date === today)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      income,
      expense,
      lent,
      balance: income - expense - lent,
      todayIncome,
      todayExpense,
    };
  }, [data]);

  const addIncome = (e) => {
    e.preventDefault();

    const form = new FormData(e.currentTarget);
    const amount = Number(form.get("amount"));
    const source = String(form.get("source") || "").trim();
    const note = String(form.get("note") || "").trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Kirim summasi 0 dan katta bo'lishi kerak.");
      return;
    }

    if (amount > 1000000000000) {
      alert("Summa juda katta.");
      return;
    }

    const transaction = {
      id: uid(),
      type: "income",
      amount,
      source,
      note,
      date: localDate(),
      createdAt: Date.now(),
    };

    save({
      ...data,
      transactions: [transaction, ...data.transactions],
    });

    e.currentTarget.reset();
    setPage("home");
  };

  const addExpense = (e) => {
    e.preventDefault();

    const form = new FormData(e.currentTarget);
    const amount = Number(form.get("amount"));
    const note = String(form.get("note") || "").trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Xarajat summasi 0 dan katta bo'lishi kerak.");
      return;
    }

    if (amount > 1000000000000) {
      alert("Summa juda katta.");
      return;
    }

    if (amount > stats.balance) {
      const ok = confirm(
        "Bu xarajat hozirgi balansingizdan katta. Balans manfiy bo'ladi. Davom etasizmi?"
      );
      if (!ok) return;
    }

    const transaction = {
      id: uid(),
      type: "expense",
      amount,
      note,
      date: localDate(),
      createdAt: Date.now(),
    };

    save({
      ...data,
      transactions: [transaction, ...data.transactions],
    });

    e.currentTarget.reset();
    setPage("home");
  };

  const addDebt = (e) => {
    e.preventDefault();

    const form = new FormData(e.currentTarget);
    const person = String(form.get("person") || "").trim();
    const amount = Number(form.get("amount"));
    const note = String(form.get("note") || "").trim();

    if (!person) {
      alert("Qarz olgan odamning ismini kiriting.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Qarz summasi 0 dan katta bo'lishi kerak.");
      return;
    }

    if (amount > 1000000000000) {
      alert("Summa juda katta.");
      return;
    }

    if (amount > stats.balance) {
      const ok = confirm(
        "Bu qarz hozirgi balansingizdan katta. Balans manfiy bo'ladi. Davom etasizmi?"
      );
      if (!ok) return;
    }

    const debt = {
      id: uid(),
      person,
      amount,
      note,
      date: localDate(),
      repaid: false,
      createdAt: Date.now(),
    };

    save({
      ...data,
      debts: [debt, ...data.debts],
    });

    e.currentTarget.reset();
    setPage("home");
  };

  const repayDebt = (id) => {
    const debt = data.debts.find((d) => d.id === id);

    if (!debt || debt.repaid) return;

    const transaction = {
      id: uid(),
      type: "income",
      amount: Number(debt.amount),
      source: `Qarz qaytdi: ${debt.person}`,
      note: debt.note || "",
      date: localDate(),
      createdAt: Date.now(),
      debtId: debt.id,
    };

    const debts = data.debts.map((d) =>
      d.id === id
        ? {
            ...d,
            repaid: true,
            repaidDate: localDate(),
          }
        : d
    );

    save({
      ...data,
      debts,
      transactions: [transaction, ...data.transactions],
    });
  };

  const deleteTransaction = (id) => {
    const ok = confirm("Bu tranzaksiyani o'chirmoqchimisiz?");
    if (!ok) return;

    save({
      ...data,
      transactions: data.transactions.filter((t) => t.id !== id),
    });
  };

  const deleteDebt = (id) => {
    const debt = data.debts.find((d) => d.id === id);

    if (!debt) return;

    if (!debt.repaid) {
      alert(
        "Ochiq qarzni o'chirib bo'lmaydi. Avval qarz qaytarilganini belgilang."
      );
      return;
    }

    const ok = confirm("Bu qarz yozuvini o'chirmoqchimisiz?");
    if (!ok) return;

    save({
      ...data,
      debts: data.debts.filter((d) => d.id !== id),
    });
  };

  const clearAllData = () => {
    const ok = confirm(
      "Barcha ma'lumotlar o'chiriladi. Bu amalni qaytarib bo'lmaydi. Davom etasizmi?"
    );

    if (!ok) return;

    save(EMPTY_DATA);
    setPage("home");
  };

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="logo">Pulyon</div>
          <div className="subtitle">Shaxsiy pul nazorati</div>
        </div>
        <button className="icon-btn" onClick={() => setPage("settings")}>
          ⚙
        </button>
      </header>

      <main className="content">
        {page === "home" && (
          <>
            <section className="balance-card">
              <span>Joriy balans</span>
              <strong>{money(stats.balance)}</strong>
            </section>

            <section className="stats-grid">
              <div className="stat-card">
                <span>Bugungi kirim</span>
                <strong>{money(stats.todayIncome)}</strong>
              </div>

              <div className="stat-card">
                <span>Bugungi xarajat</span>
                <strong>{money(stats.todayExpense)}</strong>
              </div>

              <div className="stat-card">
                <span>Berilgan qarz</span>
                <strong>{money(stats.lent)}</strong>
              </div>

              <div className="stat-card">
                <span>Jami kirim</span>
                <strong>{money(stats.income)}</strong>
              </div>
            </section>

            <section className="card">
              <h2>Tezkor amallar</h2>

              <div className="quick-actions">
                <button onClick={() => setPage("income")}>
                  <b>＋</b>
                  <span>Kirim</span>
                </button>

                <button onClick={() => setPage("expense")}>
                  <b>−</b>
                  <span>Xarajat</span>
                </button>

                <button onClick={() => setPage("debt")}>
                  <b>↗</b>
                  <span>Qarz berish</span>
                </button>

                <button onClick={() => setPage("history")}>
                  <b>☷</b>
                  <span>Tarix</span>
                </button>
              </div>
            </section>

            <section className="card">
              <div className="section-head">
                <h2>Ochiq qarzlar</h2>
                <button onClick={() => setPage("debt")}>Barchasi</button>
              </div>

              {data.debts.filter((d) => !d.repaid).length === 0 ? (
                <div className="empty">Hozircha ochiq qarz yo'q.</div>
              ) : (
                <div className="list">
                  {data.debts
                    .filter((d) => !d.repaid)
                    .slice(0, 3)
                    .map((debt) => (
                      <div className="list-item" key={debt.id}>
                        <div>
                          <b>{debt.person}</b>
                          <small>{debt.date}</small>
                        </div>
                        <strong>{money(debt.amount)}</strong>
                      </div>
                    ))}
                </div>
              )}
            </section>
          </>
        )}

        {page === "income" && (
          <section className="card form-card">
            <h1>Kirim qo'shish</h1>

            <form onSubmit={addIncome}>
              <label>
                Summa
                <input
                  name="amount"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Masalan: 500000"
                  required
                />
              </label>

              <label>
                Manba
                <input
                  name="source"
                  maxLength="100"
                  placeholder="Masalan: Oylik"
                />
              </label>

              <label>
                Izoh
                <textarea
                  name="note"
                  maxLength="300"
                  placeholder="Qo'shimcha ma'lumot"
                />
              </label>

              <button className="primary" type="submit">
                Kirimni saqlash
              </button>
            </form>
          </section>
        )}

        {page === "expense" && (
          <section className="card form-card">
            <h1>Xarajat qo'shish</h1>

            <form onSubmit={addExpense}>
              <label>
                Summa
                <input
                  name="amount"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Masalan: 100000"
                  required
                />
              </label>

              <label>
                Izoh
                <textarea
                  name="note"
                  maxLength="300"
                  placeholder="Nimaga sarflandi?"
                />
              </label>

              <button className="primary" type="submit">
                Xarajatni saqlash
              </button>
            </form>
          </section>
        )}

        {page === "debt" && (
          <section className="card form-card">
            <h1>Qarz berish</h1>

            <form onSubmit={addDebt}>
              <label>
                Odam
                <input
                  name="person"
                  maxLength="100"
                  placeholder="Ismi"
                  required
                />
              </label>

              <label>
                Summa
                <input
                  name="amount"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Masalan: 200000"
                  required
                />
              </label>

              <label>
                Izoh
                <textarea
                  name="note"
                  maxLength="300"
                  placeholder="Qo'shimcha ma'lumot"
                />
              </label>

              <button className="primary" type="submit">
                Qarzni saqlash
              </button>
            </form>

            <hr />

            <h2>Qarzlar</h2>

            {data.debts.length === 0 ? (
              <div className="empty">Hozircha qarzlar yo'q.</div>
            ) : (
              <div className="list">
                {data.debts.map((debt) => (
                  <div className="debt-item" key={debt.id}>
                    <div>
                      <b>{debt.person}</b>
                      <small>{debt.date}</small>
                      {debt.note && <small>{debt.note}</small>}
                    </div>

                    <div className="debt-right">
                      <strong>{money(debt.amount)}</strong>

                      {debt.repaid ? (
                        <span className="badge success">Qaytgan</span>
                      ) : (
                        <button
                          className="small-btn"
                          onClick={() => repayDebt(debt.id)}
                        >
                          Qaytdi
                        </button>
                      )}

                      {debt.repaid && (
                        <button
                          className="delete-btn"
                          onClick={() => deleteDebt(debt.id)}
                        >
                          O'chirish
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {page === "history" && (
          <section className="card">
            <h1>Tarix</h1>

            {data.transactions.length === 0 ? (
              <div className="empty">Hozircha tranzaksiyalar yo'q.</div>
            ) : (
              <div className="list">
                {data.transactions.map((t) => (
                  <div className="transaction" key={t.id}>
                    <div>
                      <b>
                        {t.type === "income" ? "Kirim" : "Xarajat"}
                      </b>
                      <small>{t.date}</small>
                      {t.source && <small>{t.source}</small>}
                      {t.note && <small>{t.note}</small>}
                    </div>

                    <div className="transaction-right">
                      <strong className={t.type}>
                        {t.type === "income" ? "+" : "-"}
                        {money(t.amount)}
                      </strong>

                      <button
                        className="delete-btn"
                        onClick={() => deleteTransaction(t.id)}
                      >
                        O'chirish
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {page === "settings" && (
          <section className="card">
            <h1>Sozlamalar</h1>

            <div className="setting-row">
              <span>Valyuta</span>
              <b>UZS — so'm</b>
            </div>

            <div className="setting-row">
              <span>Tranzaksiyalar</span>
              <b>{data.transactions.length}</b>
            </div>

            <div className="setting-row">
              <span>Qarzlar</span>
              <b>{data.debts.length}</b>
            </div>

            <button className="danger" onClick={clearAllData}>
              Barcha ma'lumotlarni o'chirish
            </button>
          </section>
        )}
      </main>

      <nav className="bottom-nav">
        <button
          className={page === "home" ? "active" : ""}
          onClick={() => setPage("home")}
        >
          <span>⌂</span>
          Bosh sahifa
        </button>

        <button
          className={page === "income" ? "active" : ""}
          onClick={() => setPage("income")}
        >
          <span>＋</span>
          Kirim
        </button>

        <button
          className={page === "expense" ? "active" : ""}
          onClick={() => setPage("expense")}
        >
          <span>−</span>
          Xarajat
        </button>

        <button
          className={page === "debt" ? "active" : ""}
          onClick={() => setPage("debt")}
        >
          <span>↗</span>
          Qarzlar
        </button>

        <button
          className={page === "history" ? "active" : ""}
          onClick={() => setPage("history")}
        >
          <span>☷</span>
          Tarix
        </button>

        <button
          className={page === "settings" ? "active" : ""}
          onClick={() => setPage("settings")}
        >
          <span>⚙</span>
          Sozlama
        </button>
      </nav>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
