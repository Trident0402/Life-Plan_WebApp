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
    const isMob = typeof isMobile === 'function' && isMobile();
    const ages        = results.map(r => r.age);
    const totalAssets = results.map(r => r.totalAssets / 10000);
    const invested    = results.map(r => r.investedAssets / 10000);
    const cashArr     = results.map(r => r.cashAssets / 10000);
    const netCf       = results.map(r => r.netCashFlow / 10000);

    const tickStep = isMob ? 5 : 1; // 手機版 x 軸密度減少

    // Light Theme Colors
    const colorTotal = '#8c9e82'; // Sage Green
    const colorInv   = 'rgba(217, 193, 156, 0.4)'; // Warm Beige/Wheat Fill
    const colorInvLine = '#d9c19c';
    const colorCash  = 'rgba(129, 156, 141, 0.3)'; // Muted Teal/Green Fill
    const colorCashLine = '#819c8d';
    
    const fontColor = '#7a7a7a';
    const gridColor = 'rgba(0,0,0,0.04)';

    const tooltipOpts = {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#4a4a4a',
        bodyColor: '#4a4a4a',
        borderColor: 'rgba(0,0,0,0.08)',
        borderWidth: 1,
        padding: 12,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 }
    };

    // ── Asset chart ──
    destroyChart(assetChartInst);
    assetChartInst = new Chart(
        document.getElementById('assetChart').getContext('2d'),
        {
            type: 'line',
            data: {
                labels: ages,
                datasets: [
                    { label: '總資產 (萬)', data: totalAssets, borderColor: colorTotal, backgroundColor: colorTotal, borderWidth: 3, pointRadius: isMob?0:2, pointHoverRadius: 6, tension: 0.4, fill: false, order: 1 },
                    { label: '投資部位 (萬)', data: invested, borderColor: colorInvLine, backgroundColor: colorInv, borderWidth: 1.5, pointRadius: 0, tension: 0.4, fill: true, order: 2 },
                    { label: '現金部位 (萬)', data: cashArr, borderColor: colorCashLine, backgroundColor: colorCash, borderWidth: 1.5, pointRadius: 0, tension: 0.4, fill: true, order: 3 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { position: 'top', labels: { color: fontColor, font: { size: 13, family: 'Inter' }, usePointStyle: true, boxWidth: 8 } },
                    tooltip: {
                        ...tooltipOpts,
                        callbacks: {
                            title: c => `${c[0].label} 歲`,
                            label: c => ` ${c.dataset.label}: ${c.parsed.y.toFixed(1)} 萬`
                        }
                    },
                    annotation: buildAnnotations(results)
                },
                scales: {
                    x: { 
                        ticks: { 
                            color: fontColor, font: { size: 11 },
                            callback: function(val, index) {
                                const age = ages[index];
                                return (age % tickStep === 0) ? age : null;
                            },
                            maxRotation: 0 
                        }, 
                        grid: { color: gridColor }, 
                        title: { display: !isMob, text: '年齡', color: fontColor } 
                    },
                    y: { 
                        ticks: { color: fontColor, font: { size: 11 } }, 
                        grid: { color: gridColor }, 
                        title: { display: !isMob, text: '金額 (萬)', color: fontColor } 
                    }
                }
            }
        }
    );

    // ── Cash flow chart ──
    destroyChart(cfChartInst);
    const cfColors = netCf.map(v => v >= 0 ? '#a8b89f' : '#d89b88'); // Light Sage vs Muted Red
    cfChartInst = new Chart(
        document.getElementById('cashFlowChart').getContext('2d'),
        {
            type: 'bar',
            data: {
                labels: ages,
                datasets: [{ label: '年度淨現金流 (萬)', data: netCf, backgroundColor: cfColors, borderColor: cfColors, borderWidth: 0, borderRadius: 4 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: fontColor, usePointStyle: true, boxWidth: 8 } },
                    tooltip: {
                        ...tooltipOpts,
                        callbacks: {
                            title: c => `${c[0].label} 歲`,
                            label: c => ` 淨現金流: ${c.parsed.y.toFixed(1)} 萬`
                        }
                    }
                },
                scales: {
                    x: { 
                        ticks: { 
                            color: fontColor, font: { size: 11 },
                            callback: function(val, index) {
                                const age = ages[index];
                                return (age % tickStep === 0) ? age : null;
                            },
                            maxRotation: 0 
                        }, 
                        grid: { color: gridColor }, 
                        title: { display: !isMob, text: '年齡', color: fontColor } 
                    },
                    y: { 
                        ticks: { color: fontColor, font: { size: 11 } }, 
                        grid: { color: gridColor }, 
                        title: { display: !isMob, text: '萬', color: fontColor } 
                    }
                }
            }
        }
    );
}

function buildAnnotations(results) {
    const isMob = typeof isMobile === 'function' && isMobile();
    const annotations = {};
    const seen = new Set();
    results.forEach(r => {
        if ((r.note.includes('買房') || r.note.includes('買車') || r.note.includes('退休') || r.note.includes('破產')) && !seen.has(r.age)) {
            const label = r.note.replace(/【|】/g, '').split(':')[0].trim().slice(0, 8);
            annotations[`evt_${r.age}`] = {
                type: 'point', xValue: r.age, yValue: r.totalAssets / 10000,
                backgroundColor: '#d9c19c', radius: isMob ? 4 : 6,
                borderColor: '#ffffff', borderWidth: 2,
                label: {
                    display: !isMob,
                    content: label, color: '#4a4a4a',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 6,
                    font: { size: 11, weight: 'bold' }, position: 'top',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
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
// Earthy Light Theme Pie Colors (Sage, Beige, Pink, Gray, etc.)
const PIE_COLORS = ['#8c9e82', '#e4dbc5', '#d89b88', '#c4cbcf', '#a8b89f', '#d9c19c', '#9eb0a8', '#f2d6c9'];

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
        data: { labels: md.labels, datasets: [{ data: md.data, backgroundColor: PIE_COLORS, borderColor: '#ffffff', borderWidth: 2, hoverOffset: 4 }] },
        options: pieOpts(`${age} 歲 月收支 (月收: ${Math.round(mInc).toLocaleString('zh-TW')})`)
    });

    destroyChart(pieYearlyInst);
    const yd = mkData(yItems);
    pieYearlyInst = new Chart(document.getElementById('pieYearly').getContext('2d'), {
        type: 'doughnut',
        data: { labels: yd.labels, datasets: [{ data: yd.data, backgroundColor: PIE_COLORS, borderColor: '#ffffff', borderWidth: 2, hoverOffset: 4 }] },
        options: pieOpts(`${age} 歲 年度收支 (年收: ${(res.income/10000).toFixed(1)}萬)`)
    });

    destroyChart(pieAssetInst);
    const ad = { labels: [], data: [] };
    if (res.cashAssets > 0) { ad.labels.push('現金存款'); ad.data.push(res.cashAssets); }
    if (res.investedAssets > 0) { ad.labels.push('投資組合'); ad.data.push(res.investedAssets); }
    pieAssetInst = new Chart(document.getElementById('pieAsset').getContext('2d'), {
        type: 'doughnut',
        data: { labels: ad.labels, datasets: [{ data: ad.data, backgroundColor: ['#a8b89f','#d9c19c'], borderColor: '#ffffff', borderWidth: 2, hoverOffset: 4 }] },
        options: pieOpts(`${age} 歲 資產配置 (總額: ${((res.cashAssets+res.investedAssets)/10000).toFixed(1)}萬)`)
    });
}

function pieOpts(title) {
    const isMob = typeof isMobile === 'function' && isMobile();
    return {
        responsive: true, maintainAspectRatio: false,
        cutout: '55%', // Makes it look more modern and thin
        plugins: {
            legend: { 
                position: isMob ? 'bottom' : 'right', 
                labels: { color: '#7a7a7a', font: { size: isMob ? 11 : 12 }, padding: 12, usePointStyle: true, boxWidth: 8 } 
            },
            title: { 
                display: true, text: title, color: '#4a4a4a', 
                font: { size: isMob ? 14 : 14, weight: 'bold' }, padding: { bottom: 16 } 
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.95)', titleColor: '#4a4a4a', bodyColor: '#4a4a4a',
                borderColor: 'rgba(0,0,0,0.08)', borderWidth: 1, padding: 12,
                callbacks: { label: c => ` ${c.label}: ${(c.parsed/10000).toFixed(2)} 萬` }
            }
        }
    };
}
