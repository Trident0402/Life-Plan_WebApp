/**
 * 個人財務報表渲染 (statements.js)
 */

function renderStatements(res) {
    if (!res) return;
    const fmt = v => Math.round(v).toLocaleString('zh-TW');

    // ── 資產負債表 ──
    const totalLiab = res.remainingMortgage + res.remainingDebt + res.remainingCarLoan;
    const netWorth  = res.totalAssets - totalLiab;

    document.getElementById('bs-cash').textContent    = fmt(res.cashAssets);
    document.getElementById('bs-invest').textContent  = fmt(res.investedAssets);
    document.getElementById('bs-totalA').textContent  = fmt(res.totalAssets);
    document.getElementById('bs-mortgage').textContent= fmt(res.remainingMortgage);
    document.getElementById('bs-car').textContent     = fmt(res.remainingCarLoan);
    document.getElementById('bs-debt').textContent    = fmt(res.remainingDebt);
    document.getElementById('bs-totalL').textContent  = fmt(totalLiab);
    document.getElementById('bs-netWorth').textContent= fmt(netWorth);
    document.getElementById('bs-netWorth').className  = netWorth >= 0 ? 'stmt-value positive' : 'stmt-value negative';

    // ── 損益表 ──
    const impliedEvent = Math.max(0, res.expenses - (res.livingExpense*12 + res.travelExpense*12 + res.mortgageExpense*12 + res.carExpense*12 + res.debtExpense*12 + res.customExpense*12 + res.tax));
    const netIncome = res.income - res.expenses;

    document.getElementById('is-income').textContent   = fmt(res.income);
    document.getElementById('is-living').textContent   = fmt(res.livingExpense * 12);
    document.getElementById('is-travel').textContent   = fmt(res.travelExpense * 12);
    document.getElementById('is-mortgage').textContent = fmt(res.mortgageExpense * 12);
    document.getElementById('is-car').textContent      = fmt(res.carExpense * 12);
    document.getElementById('is-debt').textContent     = fmt(res.debtExpense * 12);
    document.getElementById('is-tax').textContent      = fmt(res.tax);
    document.getElementById('is-custom').textContent   = fmt(res.customExpense * 12);
    document.getElementById('is-event').textContent    = impliedEvent > 1 ? fmt(impliedEvent) : '—';
    document.getElementById('is-totalExp').textContent = fmt(res.expenses);
    document.getElementById('is-netIncome').textContent= fmt(netIncome);
    document.getElementById('is-netIncome').className  = netIncome >= 0 ? 'stmt-value positive' : 'stmt-value negative';

    // ── 現金流量表 ──
    document.getElementById('cf-netIncome').textContent  = fmt(netIncome);
    document.getElementById('cf-invGain').textContent    = fmt(res.invGain || 0);
    document.getElementById('cf-cashEnd').textContent    = fmt(res.cashAssets);
    document.getElementById('cf-investEnd').textContent  = fmt(res.investedAssets);
    document.getElementById('cf-note').textContent       = res.note || '無';
}
