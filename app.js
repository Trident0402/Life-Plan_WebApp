/**
 * 主程式邏輯 (app.js)
 */

let simResults = [];
let lastScore  = null;

// ─────────────────────────────────────────────────
//  工具函式
// ─────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const numVal  = id => parseFloat($(id).value) || 0;
const intVal  = id => parseInt($(id).value)   || 0;
const strVal  = id => $(id).value.trim();
const fmtWan  = v  => (v / 10000).toFixed(1);
const isMobile = () => window.innerWidth <= 768;

// ─────────────────────────────────────────────────
//  Slider sync
// ─────────────────────────────────────────────────
function bindSliders() {
    document.querySelectorAll('.slider-wrap input[type=range]').forEach(sl => {
        const display = sl.parentElement.querySelector('.slider-val');
        const sync = () => { if (display) display.textContent = sl.value; };
        sl.addEventListener('input', sync);
        sync();
    });
}

// ─────────────────────────────────────────────────
//  Tab navigation (Desktop) & Mobile Navigation
// ─────────────────────────────────────────────────
function initTabs() {
    // 左側參數分頁 (Desktop + Mobile 共通)
    document.querySelectorAll('.ptab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.ptab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.ptab-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            $(btn.dataset.target).classList.add('active');
        });
    });

    // 右側結果分頁 (Desktop 專用)
    document.querySelectorAll('.rtab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.rtab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.rtab-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            $(btn.dataset.target).classList.add('active');

            // 觸發圖表 resize
            if (btn.dataset.target === 'tab-charts' && simResults.length) renderMainCharts(simResults);
        });
    });
}

function initMobileNavigation() {
    // 預設為輸入視圖 (如果沒有的話)
    if (!document.body.className.includes('mob-view-')) {
        document.body.classList.add('mob-view-input');
    }

    // 綁定底部導覽按鈕
    document.querySelectorAll('.mob-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mob-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // 清除所有的 mobile view class
            document.body.classList.remove('mob-view-input', 'mob-view-charts', 'mob-view-reports', 'mob-view-score');
            const viewId = btn.dataset.view;
            document.body.classList.add(viewId);
            
            // 如果切換到圖表，觸發重繪確保自適應
            if (viewId === 'mob-view-charts' && simResults.length) {
                setTimeout(() => { renderMainCharts(simResults); }, 50);
            }
            
            // 捲動到頂部
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

function initAccordion() {
    document.querySelectorAll('.stmt-accordion-header').forEach(header => {
        header.addEventListener('click', () => {
            // 在桌面版不啟用折疊功能（CSS 已隱藏箭頭並鎖死高度）
            if (!isMobile()) return;
            
            const body = header.nextElementSibling;
            const isOpen = body.classList.toggle('open');
            const arrow = header.querySelector('.accordion-arrow');
            if (arrow) arrow.textContent = isOpen ? '▲' : '▼';
        });
    });
}

// ─────────────────────────────────────────────────
//  收集表單參數
// ─────────────────────────────────────────────────
function collectParams() {
    const dAmt  = numVal('debt-amount');
    const dRate = numVal('debt-rate') / 100;
    const dMon  = intVal('debt-months');
    let mDebt = 0;
    if (dAmt > 0 && dMon > 0) {
        const mr = dRate / 12;
        mDebt = mr > 0
            ? dAmt * mr * Math.pow(1+mr, dMon) / (Math.pow(1+mr, dMon) - 1)
            : dAmt / dMon;
    }
    const debtYears = Math.ceil(dMon / 12);

    return {
        currentAge:           intVal('current-age'),
        retirementAge:        intVal('retire-age'),
        lifeExpectancy:       intVal('life-exp'),
        currentCash:          numVal('current-cash'),
        currentInvestments:   numVal('current-inv'),
        monthlyIncome:        numVal('monthly-income'),
        annualBonusMonths:    numVal('bonus-months'),
        incomeGrowthRate:     numVal('income-growth') / 100,
        monthlyLivingExpenses:numVal('monthly-living'),
        annualTravelExpenses: numVal('travel-exp'),
        monthlyDebtRepayment: mDebt,
        debtYears,
        debtAmount:           dAmt,
        debtRate:             dRate,
        inflationRate:        numVal('inflation') / 100,
        investmentReturnRate: numVal('inv-return') / 100,
        investmentRatio:      numVal('inv-ratio') / 100,
        mortgageStartAge:     intVal('mortgage-age'),
        mortgageHousePrice:   numVal('mortgage-price'),
        mortgageDownRatio:    numVal('mortgage-down') / 100,
        mortgageYears:        intVal('mortgage-years'),
        mortgageGraceYears:   intVal('mortgage-grace'),
        mortgageRate:         numVal('mortgage-rate') / 100,
        mortgageOtherFees:    numVal('mortgage-fees'),
        carStartAge:          intVal('car-age'),
        carPrice:             numVal('car-price'),
        carDownRatio:         numVal('car-down') / 100,
        carLoanYears:         intVal('car-years'),
        carLoanRate:          numVal('car-rate') / 100,
        ce1Name:              strVal('ce1-name'),
        ce1Age:               intVal('ce1-age'),
        ce1Amount:            numVal('ce1-amount'),
        ce1Months:            intVal('ce1-months'),
        ce2Name:              strVal('ce2-name'),
        ce2Age:               intVal('ce2-age'),
        ce2Amount:            numVal('ce2-amount'),
        ce2Months:            intVal('ce2-months'),
        taxExemption:         numVal('tax-exemption'),
        taxStdDeduction:      numVal('tax-std'),
        taxSalDeduction:      numVal('tax-sal'),
    };
}

// ─────────────────────────────────────────────────
//  填充表單
// ─────────────────────────────────────────────────
function fillForm(p) {
    const setV = (id, v) => { const el = $(id); if (el && v !== undefined) el.value = v; };
    const syncSl = id => {
        const el = $(id); if (!el) return;
        const disp = el.parentElement?.querySelector('.slider-val');
        if (disp) disp.textContent = el.value;
    };

    setV('current-age',    p.currentAge);
    setV('retire-age',     p.retirementAge);
    setV('life-exp',       p.lifeExpectancy);
    setV('current-cash',   p.currentCash);
    setV('current-inv',    p.currentInvestments);
    setV('monthly-income', p.monthlyIncome);
    setV('bonus-months',   p.annualBonusMonths);
    setV('income-growth',  p.incomeGrowthRate);   syncSl('income-growth');
    setV('monthly-living', p.monthlyLivingExpenses);
    setV('travel-exp',     p.annualTravelExpenses);
    setV('inv-ratio',      p.investmentRatio);     syncSl('inv-ratio');
    setV('inflation',      p.inflationRate);       syncSl('inflation');
    setV('inv-return',     p.investmentReturnRate);syncSl('inv-return');
    setV('debt-amount',    p.debtAmount);
    setV('debt-rate',      p.debtRate);            syncSl('debt-rate');
    setV('debt-months',    p.debtMonths);
    setV('mortgage-age',   p.mortgageStartAge);
    setV('mortgage-price', p.mortgageHousePrice);
    setV('mortgage-down',  p.mortgageDownRatio);   syncSl('mortgage-down');
    setV('mortgage-years', p.mortgageYears);
    setV('mortgage-grace', p.mortgageGraceYears);
    setV('mortgage-rate',  p.mortgageRate);        syncSl('mortgage-rate');
    setV('mortgage-fees',  p.mortgageOtherFees);
    setV('car-age',        p.carStartAge);
    setV('car-price',      p.carPrice);
    setV('car-down',       p.carDownRatio);        syncSl('car-down');
    setV('car-years',      p.carLoanYears);
    setV('car-rate',       p.carLoanRate);         syncSl('car-rate');
    setV('ce1-name',       p.ce1Name);
    setV('ce1-age',        p.ce1Age);
    setV('ce1-amount',     p.ce1Amount);
    setV('ce1-months',     p.ce1Months);
    setV('ce2-name',       p.ce2Name);
    setV('ce2-age',        p.ce2Age);
    setV('ce2-amount',     p.ce2Amount);
    setV('ce2-months',     p.ce2Months);
    setV('tax-exemption',  p.taxExemption);
    setV('tax-std',        p.taxStdDeduction);
    setV('tax-sal',        p.taxSalDeduction);
}

// ─────────────────────────────────────────────────
//  主推算流程
// ─────────────────────────────────────────────────
function runSimulation() {
    const btn = $('btn-run');
    btn.disabled = true;
    btn.textContent = '計算中…';

    setTimeout(() => {
        try {
            const p = collectParams();
            const sim = new Simulator(p);
            simResults = sim.run();
            lastScore  = sim.calculateScore();

            // 更新摘要
            updateSummaryBar(simResults, lastScore, p);

            // 圖表
            renderMainCharts(simResults);

            // 圓餅圖預設第一年
            updatePieAge(p.currentAge);
            const pieSlider = $('pie-age-slider');
            pieSlider.min   = p.currentAge;
            pieSlider.max   = p.lifeExpectancy;
            pieSlider.value = p.currentAge;
            $('pie-age-label').textContent = `${p.currentAge} 歲`;

            // 資產水位表
            renderAssetTable(simResults, p.currentAge);

            // 財務報表
            updateStmtAge(p.currentAge);
            const stmtSlider = $('stmt-age-slider');
            stmtSlider.min   = p.currentAge;
            stmtSlider.max   = p.lifeExpectancy;
            stmtSlider.value = p.currentAge;
            $('stmt-age-label').textContent = `${p.currentAge} 歲`;

            // 評分面板
            renderScorePanel(lastScore);

            showToast('✅ 推算完成！', 'success');

            // 📱 手機版：推算完成後自動跳轉到圖表分析視圖
            if (isMobile()) {
                document.body.classList.remove('mob-view-input', 'mob-view-charts', 'mob-view-reports', 'mob-view-score');
                document.body.classList.add('mob-view-charts');
                document.querySelectorAll('.mob-tab').forEach(b => {
                    b.classList.toggle('active', b.dataset.view === 'mob-view-charts');
                });
                window.scrollTo({ top: 0, behavior: 'smooth' });
                // 確保圖表尺寸正確
                setTimeout(() => renderMainCharts(simResults), 50);
            }

        } catch (e) {
            console.error(e);
            showToast(`❌ 錯誤：${e.message}`, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = '🚀 開始終身財務推算';
        }
    }, 30);
}

// ─────────────────────────────────────────────────
//  摘要條
// ─────────────────────────────────────────────────
function updateSummaryBar(results, score, p) {
    const bankruptRes = results.find(r => r.totalAssets <= 0);
    const finalAssets = results[results.length - 1].totalAssets;
    const summaryEl   = $('summary-bar');

    if (bankruptRes) {
        summaryEl.className = 'summary-bar danger';
        summaryEl.innerHTML = `⚠️ 警告：根據推算，您將在 <b>${bankruptRes.age} 歲</b>時破產！建議調整收支。&nbsp;&nbsp;<b>評分: ${score.score}/100</b>`;
    } else {
        summaryEl.className = 'summary-bar success';
        summaryEl.innerHTML = `✅ 恭喜！您能安穩度過一生。預計 <b>${p.lifeExpectancy} 歲</b>時剩餘總資產約 <b>${fmtWan(finalAssets)} 萬</b>。&nbsp;&nbsp;<b>評分: ${score.score}/100</b>`;
    }
}

// ─────────────────────────────────────────────────
//  資產水位表
// ─────────────────────────────────────────────────
function renderAssetTable(results, currentAge) {
    const tbody = $('asset-table-body');
    tbody.innerHTML = '';
    results.forEach(r => {
        const isMilestone = (r.age - currentAge) % 5 === 0 && r.age !== currentAge;
        const isBankrupt  = r.totalAssets <= 0;
        const tr = document.createElement('tr');
        if (isMilestone) tr.classList.add('milestone');
        if (isBankrupt)  tr.classList.add('bankrupt');
        const cfClass = r.netCashFlow >= 0 ? 'pos' : 'neg';
        const noteDisp = (isMilestone ? '🌟 [5年里程碑] ' : '') + (r.note || '');
        tr.innerHTML = `
            <td class="center">${r.age}</td>
            <td class="right">${fmtWan(r.totalAssets)}</td>
            <td class="right">${fmtWan(r.investedAssets)}</td>
            <td class="right">${fmtWan(r.cashAssets)}</td>
            <td class="right">${fmtWan(r.tax)}</td>
            <td class="right ${cfClass}">${fmtWan(r.netCashFlow)}</td>
            <td class="note-cell">${noteDisp}</td>`;
        tbody.appendChild(tr);
    });
}

// ─────────────────────────────────────────────────
//  圓餅圖年齡更新
// ─────────────────────────────────────────────────
function updatePieAge(age) {
    const res = simResults.find(r => r.age === age);
    if (!res) return;
    $('pie-age-label').textContent = `${age} 歲`;
    renderPieCharts(res, age);
}

// ─────────────────────────────────────────────────
//  財務報表年齡更新
// ─────────────────────────────────────────────────
function updateStmtAge(age) {
    const res = simResults.find(r => r.age === age);
    if (!res) return;
    $('stmt-age-label').textContent = `${age} 歲`;
    renderStatements(res);
}

// ─────────────────────────────────────────────────
//  評分面板
// ─────────────────────────────────────────────────
function renderScorePanel(score) {
    $('score-value').textContent = score.score;
    const arc = 2 * Math.PI * 54;
    $('score-circle').style.strokeDashoffset = arc - (arc * score.score / 100);
    $('score-circle').style.stroke = score.score >= 80 ? '#66bb6a' : score.score >= 60 ? '#ffd54f' : '#ef5350';

    const commentsEl = $('score-comments');
    commentsEl.innerHTML = score.comments.map(c => `<li>${c}</li>`).join('');
    const recsEl = $('score-recs');
    recsEl.innerHTML = score.recommendations.length
        ? score.recommendations.map(r => `<li>${r}</li>`).join('')
        : '<li>您的財務規劃相當健全！</li>';
}

// ─────────────────────────────────────────────────
//  目標反向推算
// ─────────────────────────────────────────────────
function runGoalPlanner() {
    const targetAge  = intVal('goal-age');
    const currAge    = intVal('current-age');
    const currInv    = numVal('current-inv');
    const targetAmt  = numVal('goal-amount') * 10000;
    const invReturn  = numVal('inv-return') / 100;
    const invRatio   = numVal('inv-ratio') / 100;

    if (targetAge <= currAge) {
        $('goal-result').textContent = '⚠️ 目標年齡必須大於現在年齡';
        return;
    }
    const years = targetAge - currAge;
    const pmt   = calcRequiredMonthlyInvestment(targetAmt, years, invReturn, currInv);
    const resultEl = $('goal-result');

    if (invRatio > 0) {
        const totalNeeded = pmt / invRatio;
        resultEl.innerHTML = `每月須<b>投資</b>: <span class="highlight">${Math.ceil(pmt).toLocaleString('zh-TW')}</span> 元<br>
            (依 ${(invRatio*100).toFixed(0)}% 投資比例，每月<b>總結餘</b>需達: <span class="highlight">${Math.ceil(totalNeeded).toLocaleString('zh-TW')}</span> 元)`;
    } else {
        resultEl.innerHTML = `每月須依賴投資: <span class="highlight">${Math.ceil(pmt).toLocaleString('zh-TW')}</span> 元<br><small>⚠️ 投資比例為 0%，請設定投資比例以獲得完整推算。</small>`;
    }
}

// ─────────────────────────────────────────────────
//  Toast 通知
// ─────────────────────────────────────────────────
function showToast(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3000);
}

// ─────────────────────────────────────────────────
//  初始化
// ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    bindSliders();
    initTabs();
    initMobileNavigation();
    initAccordion();

    // Resize handler for Chart.js
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (simResults.length) renderMainCharts(simResults);
        }, 200);
    });

    // Run button
    $('btn-run').addEventListener('click', runSimulation);

    // Save / Load / Export / Import
    $('btn-save').addEventListener('click', () => {
        const p = collectParams();
        p.debtMonths = intVal('debt-months'); // store raw months
        if (saveScenario(p)) showToast('✅ 劇本儲存成功！', 'success');
    });

    $('btn-load').addEventListener('click', () => {
        const data = loadScenario();
        if (!data) { showToast('⚠️ 沒有已儲存的劇本', 'error'); return; }
        fillForm(data);
        showToast('✅ 劇本載入成功，請點擊推算！', 'success');
        runSimulation();
    });

    $('btn-export').addEventListener('click', () => {
        const p = collectParams();
        p.debtMonths = intVal('debt-months');
        exportScenarioJSON(p);
    });

    $('btn-import').addEventListener('click', () => {
        importScenarioJSON(data => {
            fillForm(data);
            showToast('✅ 匯入成功！', 'success');
            runSimulation();
        });
    });

    // Pie age slider
    $('pie-age-slider').addEventListener('input', e => {
        updatePieAge(parseInt(e.target.value));
    });

    // Statement age slider
    $('stmt-age-slider').addEventListener('input', e => {
        updateStmtAge(parseInt(e.target.value));
    });

    // Goal planner
    $('btn-goal').addEventListener('click', runGoalPlanner);

    // Default run on load
    runSimulation();
});
