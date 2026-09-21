import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const STORAGE_KEY = "pulyon_data_v1";
const PIN_KEY = "pulyon_pin_v1";

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

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function money(value) {
  return `${new Intl.NumberFormat("uz-UZ").format(
    Math.round(Number(value) || 0)
  )} so'm`;
}

function getPin() {
  try {
    return localStorage.getItem(PIN_KEY) || "";
  } catch {
    return "";
  }
}

function setStoredPin(pin) {
  try {
    localStorage.setItem(PIN_KEY, pin);
  } catch {}
}

/* =========================
   PIN SCREEN
========================= */

function PinScreen({ savedPin, onUnlock }) {
  const [mode, setMode] = useState(savedPin ? "login" : "create");
  const [pin, setPin] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [error, setError] = useState("");

  const title =
    mode === "create"
      ? "PIN yarating"
      : mode === "confirm"
      ? "PINni tasdiqlang"
      : "Pulyon";

  const subtitle =
    mode === "create"
      ? "Ilovangizni himoyalash uchun 4 xonali PIN yarating"
      : mode === "confirm"
      ? "Yangi PIN kodni qayta kiriting"
      : "Davom etish uchun PIN kodni kiriting";

  const addNumber = (number) => {
    if (pin.length >= 4) return;

    setError("");
    setPin((current) => current + number);
  };

  const deleteNumber = () => {
    setError("");
    setPin((current) => current.slice(0, -1));
  };

  const clearPin = () => {
    setError("");
    setPin("");
  };

  const submit = () => {
    if (pin.length !== 4) {
      setError("4 xonali PIN kiriting.");
      return;
    }

    if (mode === "create") {
      setFirstPin(pin);
      setPin("");
      setMode("confirm");
      return;
    }

    if (mode === "confirm") {
      if (pin !== firstPin) {
        setPin("");
        setError("PIN kodlar mos kelmadi.");
        return;
      }

      setStoredPin(pin);
      onUnlock(pin);
      return;
    }

    if (pin === savedPin) {
      onUnlock(pin);
    } else {
      setPin("");
      setError("PIN noto‘g‘ri.");
    }
  };

  return (
    <div className="pin-screen">
      <div className="pin-background-shape pin-shape-one" />
      <div className="pin-background-shape pin-shape-two" />

      <div className="pin-container">
        <div className="pin-brand">
          <div className="pin-brand-icon">P</div>
          <div>
            <strong>Pulyon</strong>
            <span>Shaxsiy pul nazorati</span>
          </div>
        </div>

        <div className="pin-lock">
          {mode === "login" ? "🔒" : "✦"}
        </div>

        <h1>{title}</h1>
        <p>{subtitle}</p>

        <div className={`pin-dots ${error ? "pin-shake" : ""}`}>
          {[0, 1, 2, 3].map((item) => (
            <span
              key={item}
              className={item < pin.length ? "filled" : ""}
            />
          ))}
        </div>

        {error && <div className="pin-error-text">{error}</div>}

        <div className="pin-keypad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
            <button
              key={number}
              type="button"
              className="pin-key"
              onClick={() => addNumber(String(number))}
            >
              {number}
            </button>
          ))}

          <button
            type="button"
            className="pin-key pin-control"
            onClick={clearPin}
          >
            C
          </button>

          <button
            type="button"
            className="pin-key"
            onClick={() => addNumber("0")}
          >
            0
          </button>

          <button
            type="button"
            className="pin-key pin-control"
            onClick={deleteNumber}
          >
            ←
          </button>
        </div>

        <button className="pin-submit" type="button" onClick={submit}>
          {mode === "login" ? "Ochish" : "Davom etish"}
        </button>
      </div>
    </div>
  );
}

/* =========================
   APP
========================= */

function App() {
  const [data, setData] = useState(loadData);
  const [page, setPage] = useState("home");

  const [savedPin, setSavedPinState] = useState(getPin);
  const [unlocked, setUnlocked] = useState(!getPin());

  const save = (next) => {
    setData(next);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      alert("Ma'lumotni saqlashda xatolik yuz berdi.");
    }
  };

  const goTo = (nextPage) => {
    setPage(nextPage);
  };

  const stats = useMemo(() => {
    const income = data.transactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const expense = data.transactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const lent = data.debts
      .filter((item) => !item.repaid)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const today = localDate();

    const todayIncome = data.transactions
      .filter(
        (item) => item.type === "income" && item.date === today
      )
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const todayExpense = data.transactions
      .filter(
        (item) => item.type === "expense" && item.date === today
      )
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return {
      income,
      expense,
      lent,
      balance: income - expense - lent,
      todayIncome,
      todayExpense,
    };
  }, [data]);

  /* =========================
     INCOME
  ========================= */

  const addIncome = (event) => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

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

    event.currentTarget.reset();
    goTo("home");
  };

  /* =========================
     EXPENSE
  ========================= */

  const addExpense = (event) => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

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

    event.currentTarget.reset();
    goTo("home");
  };

  /* =========================
     DEBT
  ========================= */

  const addDebt = (event) => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

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

    event.currentTarget.reset();
    goTo("home");
  };

  const repayDebt = (id) => {
    const debt = data.debts.find((item) => item.id === id);

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

    const debts = data.debts.map((item) =>
      item.id === id
        ? {
            ...item,
            repaid: true,
            repaidDate: localDate(),
          }
        : item
    );

    save({
      ...data,
      debts,
      transactions: [transaction, ...data.transactions],
    });
  };

  /* =========================
     DELETE
  ========================= */

  const deleteTransaction = (id) => {
    const ok = confirm("Bu tranzaksiyani o'chirmoqchimisiz?");

    if (!ok) return;

    save({
      ...data,
      transactions: data.transactions.filter(
        (item) => item.id !== id
      ),
    });
  };

  const deleteDebt = (id) => {
    const debt = data.debts.find((item) => item.id === id);

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
      debts: data.debts.filter((item) => item.id !== id),
    });
  };

  const clearAllData = () => {
    const ok = confirm(
      "Barcha ma'lumotlar o'chiriladi. Bu amalni qaytarib bo'lmaydi. Davom etasizmi?"
    );

    if (!ok) return;

    save(EMPTY_DATA);
    goTo("home");
  };

  /* =========================
     PIN
  ========================= */

  const lockApp = () => {
    if (!savedPin) return;

    setUnlocked(false);
    goTo("home");
  };

  const changePin = () => {
    if (!savedPin) return;

    const oldPin = prompt("Hozirgi PIN kodni kiriting:");

    if (oldPin !== savedPin) {
      alert("Hozirgi PIN noto'g'ri.");
      return;
    }

    const newPin = prompt("Yangi 4 xonali PIN kiriting:");

    if (!/^\d{4}$/.test(newPin || "")) {
      alert("PIN aynan 4 ta raqamdan iborat bo'lishi kerak.");
      return;
    }

    const confirmPin = prompt("Yangi PINni yana kiriting:");

    if (newPin !== confirmPin) {
      alert("PIN kodlar mos kelmadi.");
      return;
    }

    setStoredPin(newPin);
    setSavedPinState(newPin);

    alert("PIN muvaffaqiyatli o'zgartirildi.");
  };

  if (!unlocked) {
    return (
      <PinScreen
        savedPin={savedPin}
        onUnlock={(newPin) => {
          if (newPin) {
            setSavedPinState(newPin);
          }

          setUnlocked(true);
        }}
      />
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="logo">Pulyon</div>
          <div className="subtitle">
            Shaxsiy pul nazorati
          </div>
        </div>

        <button
          className="icon-btn"
          onClick={() => goTo("settings")}
          type="button"
        >
          ⚙
        </button>
      </header>

      <main className="content">
        {page === "home" && (
          <>
            <section className="balance-card">
              <div className="balance-decoration balance-decoration-one" />
              <div className="balance-decoration balance-decoration-two" />

              <div className="balance-label">
                <span>Joriy balans</span>
                <span className="balance-status">
                  <i /> Faol
                </span>
              </div>

              <strong>{money(stats.balance)}</strong>

              <div className="balance-footer">
                <span>Pulyon balansingiz</span>
                <span>{localDate()}</span>
              </div>
            </section>

            <section className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon income">↗</div>
                <span>Bugungi kirim</span>
                <strong>{money(stats.todayIncome)}</strong>
              </div>

              <div className="stat-card">
                <div className="stat-icon expense">↘</div>
                <span>Bugungi xarajat</span>
                <strong>{money(stats.todayExpense)}</strong>
              </div>

              <div className="stat-card">
                <div className="stat-icon debt">◈</div>
                <span>Berilgan qarz</span>
                <strong>{money(stats.lent)}</strong>
              </div>

              <div className="stat-card">
                <div className="stat-icon total">₽</div>
                <span>Jami kirim</span>
                <strong>{money(stats.income)}</strong>
              </div>
            </section>

            <section className="card">
              <div className="section-title">
                <h2>Tezkor amallar</h2>
                <p>Pulingizni tez boshqaring</p>
              </div>

              <div className="quick-actions">
                <button
                  type="button"
                  onClick={() => goTo("income")}
                >
                  <b>＋</b>
                  <span>Kirim</span>
                </button>

                <button
                  type="button"
                  onClick={() => goTo("expense")}
                >
                  <b>−</b>
                  <span>Xarajat</span>
                </button>

                <button
                  type="button"
                  onClick={() => goTo("debt")}
                >
                  <b>↗</b>
                  <span>Qarz</span>
                </button>

                <button
                  type="button"
                  onClick={() => goTo("history")}
                >
                  <b>☷</b>
                  <span>Tarix</span>
                </button>
              </div>
            </section>

            <section className="card">
              <div className="section-head">
                <div>
                  <h2>Ochiq qarzlar</h2>
                  <p>Qaytarilishi kutilayotgan pullar</p>
                </div>

                <button
                  type="button"
                  onClick={() => goTo("debt")}
                >
                  Barchasi →
                </button>
              </div>

              {data.debts.filter((item) => !item.repaid).length ===
              0 ? (
                <div className="empty">
                  <div className="empty-icon">✓</div>
                  <b>Ochiq qarz yo'q</b>
                  <span>Hozircha hammasi nazorat ostida.</span>
                </div>
              ) : (
                <div className="list">
                  {data.debts
                    .filter((item) => !item.repaid)
                    .slice(0, 3)
                    .map((debt) => (
                      <div className="list-item" key={debt.id}>
                        <div className="person-info">
                          <div className="person-avatar">
                            {debt.person
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <b>{debt.person}</b>
                            <small>{debt.date}</small>
                          </div>
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
            <div className="form-header">
              <div className="form-icon income">↗</div>

              <div>
                <h1>Kirim qo'shish</h1>
                <p>Hisobingizga yangi mablag' kiriting</p>
              </div>
            </div>

            <form onSubmit={addIncome}>
              <label>
                Summa
                <input
                  name="amount"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="500000"
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
                ✓ Kirimni saqlash
              </button>
            </form>
          </section>
        )}

        {page === "expense" && (
          <section className="card form-card">
            <div className="form-header">
              <div className="form-icon expense">↘</div>

              <div>
                <h1>Xarajat qo'shish</h1>
                <p>Pulingiz qayerga sarflanganini yozing</p>
              </div>
            </div>

            <form onSubmit={addExpense}>
              <label>
                Summa
                <input
                  name="amount"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="100000"
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

              <button
                className="primary expense-primary"
                type="submit"
              >
                ✓ Xarajatni saqlash
              </button>
            </form>
          </section>
        )}

        {page === "debt" && (
          <section className="card form-card">
            <div className="form-header">
              <div className="form-icon debt">↗</div>

              <div>
                <h1>Qarz berish</h1>
                <p>Berilgan qarzni nazoratda saqlang</p>
              </div>
            </div>

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
                  placeholder="200000"
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
                ✓ Qarzni saqlash
              </button>
            </form>

            <hr />

            <div className="section-head">
              <div>
                <h2>Qarzlar</h2>
                <p>Barcha qarz yozuvlari</p>
              </div>
            </div>

            {data.debts.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">◈</div>
                <b>Hozircha qarzlar yo'q</b>
              </div>
            ) : (
              <div className="list">
                {data.debts.map((debt) => (
                  <div className="debt-item" key={debt.id}>
                    <div className="person-info">
                      <div className="person-avatar">
                        {debt.person
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div>
                        <b>{debt.person}</b>
                        <small>{debt.date}</small>

                        {debt.note && (
                          <small>{debt.note}</small>
                        )}
                      </div>
                    </div>

                    <div className="debt-right">
                      <strong>{money(debt.amount)}</strong>

                      {debt.repaid ? (
                        <span className="badge success">
                          Qaytgan
                        </span>
                      ) : (
                        <button
                          className="small-btn"
                          type="button"
                          onClick={() => repayDebt(debt.id)}
                        >
                          Qaytdi
                        </button>
                      )}

                      {debt.repaid && (
                        <button
                          className="delete-btn"
                          type="button"
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
            <div className="section-head">
              <div>
                <h1>Tarix</h1>
                <p>Barcha pul harakatlari</p>
              </div>
            </div>

            {data.transactions.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">☷</div>
                <b>Hozircha tranzaksiyalar yo'q</b>
                <span>
                  Pul harakatlari shu yerda ko'rinadi.
                </span>
              </div>
            ) : (
              <div className="list">
                {data.transactions.map((transaction) => (
                  <div
                    className="transaction"
                    key={transaction.id}
                  >
                    <div className="person-info">
                      <div
                        className={`transaction-icon ${
                          transaction.type
                        }`}
                      >
                        {transaction.type === "income"
                          ? "↗"
                          : "↘"}
                      </div>

                      <div>
                        <b>
                          {transaction.type === "income"
                            ? "Kirim"
                            : "Xarajat"}
                        </b>

                        <small>{transaction.date}</small>

                        {transaction.source && (
                          <small>
                            {transaction.source}
                          </small>
                        )}

                        {transaction.note && (
                          <small>{transaction.note}</small>
                        )}
                      </div>
                    </div>

                    <div className="transaction-right">
                      <strong className={transaction.type}>
                        {transaction.type === "income"
                          ? "+"
                          : "-"}
                        {money(transaction.amount)}
                      </strong>

                      <button
                        className="delete-btn"
                        type="button"
                        onClick={() =>
                          deleteTransaction(transaction.id)
                        }
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
          <section className="card settings-card">
            <div className="settings-header">
              <div className="settings-icon">⚙</div>

              <div>
                <h1>Sozlamalar</h1>
                <p>Pulyon ilovasini boshqaring</p>
              </div>
            </div>

            <div className="setting-group">
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
            </div>

            <div className="settings-section-title">
              Xavfsizlik
            </div>

            <button
              className="settings-action"
              type="button"
              onClick={changePin}
            >
              <span className="settings-action-icon">
                🔐
              </span>

              <span className="settings-action-text">
                <b>PIN kodni o'zgartirish</b>
                <small>Ilovangizni himoyalang</small>
              </span>

              <span className="settings-arrow">›</span>
            </button>

            <button
              className="settings-action"
              type="button"
              onClick={lockApp}
            >
              <span className="settings-action-icon">
                🔒
              </span>

              <span className="settings-action-text">
                <b>Ilovani qulflash</b>
                <small>PIN ekraniga qaytish</small>
              </span>

              <span className="settings-arrow">›</span>
            </button>

            <div className="settings-section-title">
              Ma'lumotlar
            </div>

            <button
              className="danger"
              type="button"
              onClick={clearAllData}
            >
              Barcha ma'lumotlarni o'chirish
            </button>
          </section>
        )}
      </main>

      <nav className="bottom-nav">
        <button
          type="button"
          className={page === "home" ? "active" : ""}
          onClick={() => goTo("home")}
        >
          <span>⌂</span>
          Bosh sahifa
        </button>

        <button
          type="button"
          className={page === "income" ? "active" : ""}
          onClick={() => goTo("income")}
        >
          <span>＋</span>
          Kirim
        </button>

        <button
          type="button"
          className={page === "expense" ? "active" : ""}
          onClick={() => goTo("expense")}
        >
          <span>−</span>
          Xarajat
        </button>

        <button
          type="button"
          className={page === "debt" ? "active" : ""}
          onClick={() => goTo("debt")}
        >
          <span>↗</span>
          Qarzlar
        </button>

        <button
          type="button"
          className={page === "history" ? "active" : ""}
          onClick={() => goTo("history")}
        >
          <span>☷</span>
          Tarix
        </button>

        <button
          type="button"
          className={page === "settings" ? "active" : ""}
          onClick={() => goTo("settings")}
        >
          <span>⚙</span>
          Sozlama
        </button>
      </nav>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);           
