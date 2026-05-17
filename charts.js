/**
 * Chart.js 圖表渲染 (charts.js)
 */

let assetChartInst = null, cfChartInst = null;
let pieMonthlyInst = null, pieYearlyInst = null, pieAssetInst = null;

function destroyChart(inst) { if (inst) inst.destroy(); }

// ────────────────────────────────────────────────
//  Tab 1 ─ 資產趨勢 & 現金流圖表
// ────────────────────────────────────────────────
function renderMainCharts(results) {
    const ages        = results.map(r => r.age);
    const totalAssets = results.map(r => r.totalAssets / 10000);
    const invested    = results.map(r => r.investedAssets / 10000);
    const cashArr     = results.map(r => r.cashAssets / 10000);
    const netCf       = results.map(r => r.netCashFlow / 10000);

    // ── Asset chart ──
    destroyChart(assetChartInst);
    assetChartInst = new Chart(
        document.getElementById('assetChart').getContext('2d'),
        {
            type: 'line',
            data: {
                labels: ages,
                datasets: [
                    { label: '總資產 (萬)', data: totalAssets, borderColor: '#4fc3f7', backgroundColor: 'rgba(79,195,247,0.08)', borderWidth: 3, pointRadius: 2, pointHoverRadius: 6, tension: 0.4, fill: false, order: 1 },
                    { label: '投資部位 (萬)', data: invested, borderColor: '#ffd54f', backgroundColor: 'rgba(255,213,79,0.25)', borderWidth: 1.5, pointRadius: 0, tension: 0.4, fill: true, order: 2 },
                    { label: '現金部位 (萬)', data: cashArr, borderColor: '#81c784', backgroundColor: 'rgba(129,199,132,0.2)', borderWidth: 1.5, pointRadius: 0, tension: 0.4, fill: true, order: 3 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { labels: { color: '#e0e0e0', font: { size: 13 } } },
                    tooltip: {
                        backgroundColor: 'rgba(13,27,42,0.95)', titleColor: '#4fc3f7', bodyColor: '#e0e0e0',
                        borderColor: '#4fc3f7', borderWidth: 1,
                        callbacks: {
                            title: c => `${c[0].label} 歲`,
                            label: c => ` ${c.dataset.label}: ${c.parsed.y.toFixed(1)} 萬`
                        }
                    },
                    annotation: buildAnnotations(results)
                },
                scales: {
                    x: { ticks: { color: '#90a4ae', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' }, title: { display: true, text: '年齡', color: '#90a4ae' } },
                    y: { ticks: { color: '#90a4ae', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.07)' }, title: { display: true, text: '金額 (萬)', color: '#90a4ae' } }
                }
            }
        }
    );

    // ── Cash flow chart ──
    destroyChart(cfChartInst);
    const cfColors = netCf.map(v => v >= 0 ? 'rgba(129,199,132,0.85)' : 'rgba(239,83,80,0.85)');
    cfChartInst = new Chart(
        document.getElementById('cashFlowChart').getContext('2d'),
        {
            type: 'bar',
            data: {
                labels: ages,
                datasets: [{ label: '年度淨現金流 (萬)', data: netCf, backgroundColor: cfColors, borderColor: cfColors, borderWidth: 0, borderRadius: 2 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#e0e0e0' } },
                    tooltip: {
                        backgroundColor: 'rgba(13,27,42,0.95)', titleColor: '#ffd54f', bodyColor: '#e0e0e0',
                        borderColor: '#ffd54f', borderWidth: 1,
                        callbacks: {
                            title: c => `${c[0].label} 歲`,
                            label: c => ` 淨現金流: ${c.parsed.y.toFixed(1)} 萬`
                        }
                    }
                },
                scales: {
                    x: { ticks: { color: '#90a4ae', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' }, title: { display: true, text: '年齡', color: '#90a4ae' } },
                    y: { ticks: { color: '#90a4ae', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.07)' }, title: { display: true, text: '萬', color: '#90a4ae' } }
                }
            }
        }
    );
}

function buildAnnotations(results) {
    const annotations = {};
    const seen = new Set();
    results.forEach(r => {
        if ((r.note.includes('買房') || r.note.includes('買車') || r.note.includes('退休') || r.note.includes('破產')) && !seen.has(r.age)) {
            const label = r.note.replace(/【|】/g, '').split(':')[0].trim().slice(0, 8);
            annotations[`evt_${r.age}`] = {
                type: 'point', xValue: r.age, yValue: r.totalAssets / 10000,
                backgroundColor: 'rgba(255,213,79,0.9)', radius: 6,
                label: {
                    display: true, content: label, color: '#0d1b2a',
                    backgroundColor: 'rgba(255,213,79,0.9)', borderRadius: 4,
                    font: { size: 11, weight: 'bold' }, position: 'top'
                }
            };
            seen.add(r.age);
        }
    });
    return { annotations };
}

// ────────────────────────────────────────────────
//  Tab 2 ─ 圓餅圖
// ────────────────────────────────────────────────
const PIE_COLORS = ['#ef5350','#42a5f5','#66bb6a','#ff7043','#ffca28','#ab47bc','#26c6da','#4caf50'];

function renderPieCharts(res, age) {
    const mInc  = res.income / 12;
    const surpY = Math.max(0, res.income - (res.livingExpense*12 + res.travelExpense*12 + res.mortgageExpense*12 + res.debtExpense*12 + res.carExpense*12 + res.customExpense*12 + res.tax));
    const surpM = surpY / 12;
    const taxM  = res.tax / 12;

    const mItems = [['生活費', res.livingExpense],['旅遊', res.travelExpense],['房貸', res.mortgageExpense],['債務', res.debtExpense],['車貸', res.carExpense],['大筆消費', res.customExpense],['稅收', taxM],['結餘', surpM]];
    const yItems = [['年生活費', res.livingExpense*12],['年旅遊費', res.travelExpense*12],['年房貸', res.mortgageExpense*12],['年債務', res.debtExpense*12],['年車貸', res.carExpense*12],['年大筆消費', res.customExpense*12],['年稅收', res.tax],['年結餘', surpY]];

    const mkData = items => {
        const labels = [], data = [];
        items.forEach(([l, v]) => { if (v > 0) { labels.push(l); data.push(v); } });
        return { labels, data };
    };

    destroyChart(pieMonthlyInst);
    const md = mkData(mItems);
    pieMonthlyInst = new Chart(document.getElementById('pieMonthly').getContext('2d'), {
        type: 'doughnut',
        data: { labels: md.labels, datasets: [{ data: md.data, backgroundColor: PIE_COLORS, borderColor: '#1a2a3a', borderWidth: 2 }] },
        options: pieOpts(`${age} 歲 月收支 (月收: ${Math.round(mInc).toLocaleString('zh-TW')})`)
    });

    destroyChart(pieYearlyInst);
    const yd = mkData(yItems);
    pieYearlyInst = new Chart(document.getElementById('pieYearly').getContext('2d'), {
        type: 'doughnut',
        data: { labels: yd.labels, datasets: [{ data: yd.data, backgroundColor: PIE_COLORS, borderColor: '#1a2a3a', borderWidth: 2 }] },
        options: pieOpts(`${age} 歲 年度收支 (年收: ${(res.income/10000).toFixed(1)}萬)`)
    });

    destroyChart(pieAssetInst);
    const ad = { labels: [], data: [] };
    if (res.cashAssets > 0) { ad.labels.push('現金存款'); ad.data.push(res.cashAssets); }
    if (res.investedAssets > 0) { ad.labels.push('投資組合'); ad.data.push(res.investedAssets); }
    pieAssetInst = new Chart(document.getElementById('pieAsset').getContext('2d'), {
        type: 'doughnut',
        data: { labels: ad.labels, datasets: [{ data: ad.data, backgroundColor: ['#ab47bc','#ffd54f'], borderColor: '#1a2a3a', borderWidth: 2 }] },
        options: pieOpts(`${age} 歲 資產配置 (總額: ${((res.cashAssets+res.investedAssets)/10000).toFixed(1)}萬)`)
    });
}

function pieOpts(title) {
    return {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom', labels: { color: '#c0d0e0', font: { size: 11 }, padding: 10, boxWidth: 12 } },
            title: { display: true, text: title, color: '#e0e0e0', font: { size: 12, weight: 'bold' }, padding: { bottom: 8 } },
            tooltip: {
                backgroundColor: 'rgba(13,27,42,0.95)', titleColor: '#4fc3f7', bodyColor: '#e0e0e0',
                callbacks: { label: c => ` ${c.label}: ${(c.parsed/10000).toFixed(2)} 萬` }
            }
        }
    };
}
