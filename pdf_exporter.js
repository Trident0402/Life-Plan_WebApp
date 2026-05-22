/**
 * 人生財務規劃模擬器 — PDF 報告匯出功能
 */

const PDF_FILENAME = '人生財務分析報告.pdf';
const PDF_PAGE_WIDTH_PX = 794;
const PDF_PAGE_HEIGHT_PX = 1123;

function formatParamValue(key, val) {
    if (val === null || val === undefined) return '無';

    const pctKeys = [
        'incomeGrowthRate', 'investmentReturnRate', 'investmentRatio',
        'inflationRate', 'debtRate', 'mortgageDownRatio', 'mortgageRate',
        'carDownRatio', 'carLoanRate'
    ];

    if (pctKeys.includes(key)) {
        return `${(val * 100).toFixed(1).replace(/\.0$/, '')}%`;
    }

    if (typeof val === 'number') {
        if (val > 1000) {
            return val.toLocaleString('zh-TW', { maximumFractionDigits: 0 });
        }
        return `${val}`;
    }

    return `${val}`;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function waitForStableLayout() {
    return new Promise(resolve => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
}

function createPDFContainer() {
    const oldContainer = document.getElementById('pdf-export-container');
    if (oldContainer) oldContainer.remove();

    const container = document.createElement('div');
    container.id = 'pdf-export-container';
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = `${PDF_PAGE_WIDTH_PX}px`;
    container.style.zIndex = '9999';
    container.style.background = '#ffffff';
    container.style.opacity = '0.01';
    container.style.pointerEvents = 'none';
    container.style.overflow = 'visible';
    document.body.appendChild(container);
    return container;
}

function createPageFactory(reportRoot) {
    let pageNumber = 0;

    return {
        createPage(subtitle) {
            pageNumber += 1;

            const page = document.createElement('section');
            page.className = 'pdf-page';

            const header = document.createElement('div');
            header.className = 'pdf-header';
            header.innerHTML = `
                <h1>財務規劃分析報告</h1>
                <span>${escapeHtml(subtitle)}</span>
            `;

            const body = document.createElement('div');
            body.className = 'pdf-body';

            const footer = document.createElement('div');
            footer.className = 'pdf-footer';
            footer.innerHTML = `
                <span>Life Financial Simulator</span>
                <span>Page ${pageNumber}</span>
            `;

            page.appendChild(header);
            page.appendChild(body);
            page.appendChild(footer);
            reportRoot.appendChild(page);

            return { page, body, pageNumber };
        }
    };
}

function appendMeasuredBlock(factory, currentPage, block, subtitle) {
    currentPage.body.appendChild(block);
    if (currentPage.body.scrollHeight <= currentPage.body.clientHeight) {
        return currentPage;
    }

    currentPage.body.removeChild(block);
    const nextPage = factory.createPage(subtitle);
    nextPage.body.appendChild(block);
    return nextPage;
}

function createSectionHeading(text) {
    const heading = document.createElement('div');
    heading.className = 'pdf-section-heading';
    heading.textContent = text;
    return heading;
}

function createListItem(text, extraClass = '') {
    const item = document.createElement('li');
    item.className = `pdf-list-item ${extraClass}`.trim();
    item.textContent = text;
    return item;
}

function buildOverviewPage(factory, simResults, lastScore, params) {
    const GROUP_DEFS = [
        { title: '基本資料', keys: ['currentAge', 'retirementAge', 'lifeExpectancy'] },
        { title: '財務部位現況', keys: ['currentCash', 'currentInvestments'] },
        { title: '收益成長與通膨', keys: ['monthlyIncome', 'annualBonusMonths', 'investmentRatio', 'investmentReturnRate', 'incomeGrowthRate', 'inflationRate'] },
        { title: '生活開銷', keys: ['monthlyLivingExpenses', 'annualTravelExpenses'] },
        { title: '負債規劃', keys: ['debtAmount', 'debtRate', 'debtMonths'] },
        { title: '房貸規劃', keys: ['mortgageStartAge', 'mortgageHousePrice', 'mortgageDownRatio', 'mortgageYears', 'mortgageRate', 'mortgageGraceYears', 'mortgageOtherFees'] },
        { title: '車貸規劃', keys: ['carStartAge', 'carPrice', 'carDownRatio', 'carLoanYears', 'carLoanRate'] },
        { title: '重大消費 1', keys: ['ce1Name', 'ce1Age', 'ce1Amount', 'ce1Months'] },
        { title: '重大消費 2', keys: ['ce2Name', 'ce2Age', 'ce2Amount', 'ce2Months'] },
        { title: '稅務設定', keys: ['taxExemption', 'taxStdDeduction', 'taxSalDeduction'] }
    ];

    const PARAM_MAP = {
        currentAge: '目前年齡',
        retirementAge: '預計退休年齡',
        lifeExpectancy: '預期壽命',
        currentCash: '目前現金存款 (元)',
        currentInvestments: '目前投資部位 (元)',
        monthlyIncome: '目前月薪 (元)',
        annualBonusMonths: '預估年終 (月)',
        incomeGrowthRate: '固定年薪成長率',
        investmentReturnRate: '預期投資年化報酬率',
        investmentRatio: '結餘投入投資比例',
        monthlyLivingExpenses: '每月基本生活費 (元)',
        annualTravelExpenses: '年度旅遊基金 (元)',
        mortgageStartAge: '計畫買房年齡',
        mortgageHousePrice: '房屋總價 (元)',
        mortgageDownRatio: '頭期款比例',
        mortgageYears: '貸款總年限 (年)',
        mortgageRate: '固定房貸利率',
        mortgageGraceYears: '寬限期 (年)',
        mortgageOtherFees: '裝潢與購屋雜費 (元)',
        carStartAge: '計畫買車年齡',
        carPrice: '車輛總價 (元)',
        carDownRatio: '車貸頭期款比例',
        carLoanYears: '車貸總年限 (年)',
        carLoanRate: '固定車貸利率',
        debtAmount: '負債總額 (元)',
        debtRate: '負債年利率',
        debtMonths: '負債還款期限 (月)',
        inflationRate: '預期經濟通膨率',
        ce1Name: '重大支出 1 名稱',
        ce1Age: '消費年齡 1',
        ce1Amount: '預算總額 1 (元)',
        ce1Months: '分期月數 1',
        ce2Name: '重大支出 2 名稱',
        ce2Age: '消費年齡 2',
        ce2Amount: '預算總額 2 (元)',
        ce2Months: '分期月數 2',
        taxExemption: '免稅額 (元)',
        taxStdDeduction: '標準扣除額 (元)',
        taxSalDeduction: '薪資特別扣除額 (元)'
    };

    let leftColHtml = '';
    GROUP_DEFS.forEach(group => {
        const validItems = [];
        group.keys.forEach(key => {
            const value = params[key];
            if (value === undefined || value === '' || value === null) return;
            if ((key.startsWith('ce1') && !params.ce1Age) ||
                (key.startsWith('ce2') && !params.ce2Age) ||
                (key.startsWith('mortgage') && !params.mortgageStartAge) ||
                (key.startsWith('car') && !params.carStartAge) ||
                (key.startsWith('debt') && !params.debtAmount)) {
                return;
            }
            validItems.push({ key, value });
        });

        if (!validItems.length) return;

        leftColHtml += `<div class="pdf-box"><div class="pdf-box-title">${escapeHtml(group.title)}</div>`;
        validItems.forEach(item => {
            leftColHtml += `
                <div class="pdf-param-row">
                    <span class="pdf-param-name">${escapeHtml(PARAM_MAP[item.key] || item.key)}</span>
                    <span class="pdf-param-val">${escapeHtml(formatParamValue(item.key, item.value))}</span>
                </div>
            `;
        });
        leftColHtml += '</div>';
    });

    const scoreClass = lastScore.score >= 80 ? 'high' : (lastScore.score >= 60 ? 'mid' : 'low');
    const nowRes = simResults.find(r => r.age === params.currentAge) || simResults[0];

    let efVal = 0;
    let invRatio = 0;
    let progress = 0;
    if (nowRes) {
        const monthlyExpenseBase = nowRes.expenses > 0 ? nowRes.expenses / 12 : 1;
        efVal = nowRes.cashAssets / monthlyExpenseBase;
        invRatio = nowRes.totalAssets > 0 ? (nowRes.investedAssets / nowRes.totalAssets) * 100 : 0;
        const target = nowRes.expenses * 25 > 0 ? nowRes.expenses * 25 : 10000000;
        progress = Math.min(100, (nowRes.totalAssets / target) * 100);
    }

    const fmtWan = value => `${Math.round(value / 10000).toLocaleString('zh-TW')}萬`;
    const totalLiab = (nowRes?.remainingMortgage || 0) + (nowRes?.remainingCarLoan || 0) + (nowRes?.remainingDebt || 0);
    const netWorth = (nowRes?.totalAssets || 0) - totalLiab;

    const page = factory.createPage('Overview Dashboard');
    page.body.innerHTML = `
        <div class="pdf-grid-p1">
            <div class="pdf-col-left">${leftColHtml}</div>
            <div class="pdf-col-right">
                <div class="pdf-score-card">
                    <span class="pdf-score-label">整體財務健康得分</span>
                    <span class="pdf-score-num ${scoreClass}">
                        ${escapeHtml(lastScore.score)}
                        <span class="pdf-score-denominator">/ 100</span>
                    </span>
                </div>

                <div class="pdf-mini-title">【 ${escapeHtml(params.currentAge)} 歲詳細財務報表 】</div>

                <table class="pdf-stmt-table">
                    <thead><tr><th colspan="2">資產負債表 (Balance Sheet)</th></tr></thead>
                    <tbody>
                        <tr><td>現金資產: ${fmtWan(nowRes.cashAssets)}</td><td>房貸餘額: ${fmtWan(nowRes.remainingMortgage)}</td></tr>
                        <tr><td>投資資產: ${fmtWan(nowRes.investedAssets)}</td><td>車貸餘額: ${fmtWan(nowRes.remainingCarLoan)}</td></tr>
                        <tr class="total-row"><td>總資產估計: ${fmtWan(nowRes.totalAssets)}</td><td>總負債: ${fmtWan(totalLiab)} (淨值: ${fmtWan(netWorth)})</td></tr>
                    </tbody>
                </table>

                <table class="pdf-stmt-table is-table">
                    <thead><tr><th colspan="2">損益暨現金流量 (Income & Cash Flow)</th></tr></thead>
                    <tbody>
                        <tr><td>年度薪資: ${fmtWan(nowRes.income)}</td><td>生活支出: ${fmtWan(nowRes.livingExpense * 12)}</td></tr>
                        <tr><td>投資損益: ${fmtWan(nowRes.invGain || 0)}</td><td>房/車/債支出: ${fmtWan((nowRes.mortgageExpense + nowRes.carExpense + nowRes.debtExpense) * 12)}</td></tr>
                        <tr><td>其他支出/事件: ${fmtWan(Math.max(0, nowRes.expenses - (nowRes.livingExpense * 12 + nowRes.travelExpense * 12 + nowRes.mortgageExpense * 12 + nowRes.carExpense * 12 + nowRes.debtExpense * 12 + nowRes.customExpense * 12 + nowRes.tax)))}</td><td>稅/旅遊/自訂消費: ${fmtWan(nowRes.tax + nowRes.travelExpense * 12 + nowRes.customExpense * 12)}</td></tr>
                        <tr class="total-row"><td>總支出金額: ${fmtWan(nowRes.expenses)}</td><td>當年淨現金流: <span class="${nowRes.netCashFlow >= 0 ? 'pos' : 'neg'}">${fmtWan(nowRes.netCashFlow)}</span></td></tr>
                    </tbody>
                </table>

                <div class="pdf-metrics-grid">
                    <div class="pdf-metric-item"><div class="pdf-metric-title">緊急預備金水位</div><div class="pdf-metric-value">${efVal.toFixed(1)} 個月</div></div>
                    <div class="pdf-metric-item"><div class="pdf-metric-title">資產投資佔比</div><div class="pdf-metric-value">${invRatio.toFixed(1)}%</div></div>
                    <div class="pdf-metric-item"><div class="pdf-metric-title">退休預備進度</div><div class="pdf-metric-value">${progress.toFixed(1)}%</div></div>
                </div>

                <div class="pdf-charts-row">
                    <div class="pdf-chart-box">
                        <h3>年度收支佔比</h3>
                        <canvas id="pdf-pie-flow" width="180" height="180"></canvas>
                    </div>
                    <div class="pdf-chart-box">
                        <h3>資產配置比例</h3>
                        <canvas id="pdf-pie-asset" width="180" height="180"></canvas>
                    </div>
                </div>

                <div class="pdf-chart-box pdf-trend-box">
                    <h3>終身資產變化趨勢 (萬元)</h3>
                    <canvas id="pdf-trend-chart" width="520" height="235"></canvas>
                </div>
            </div>
        </div>
    `;

    if (page.body.scrollHeight > page.body.clientHeight) {
        page.body.classList.add('compact-overview');
    }
}

function buildScorePages(factory, lastScore) {
    const infoText = [
        '1. 投資複利設計：系統預設您結餘投入投資的時間點為年內逐步累積，資產滾動方式為「去年投資本金成長後，再加上當年投入」。',
        '2. 月薪與年薪轉換：全年總收入 = (月薪 × 12) + (月薪 × 年終月數)，退休前會依年薪成長率逐年調整。',
        '3. 房貸與寬限期：買房時會先扣頭期款與其他費用；寬限期內只付利息，結束後改以等額本息攤還。',
        '4. 其他貸款：房貸、車貸與一般負債都會依設定利率與期數，逐年計算剩餘本金並反映在報表。',
        '5. 評分機制：會綜合破產風險、晚年資產水位、退休前赤字年數、緊急預備金與負債比進行扣分。'
    ];

    const normalizeBullet = text => text
        .replace('✅', '[v] ')
        .replace('❌', '[X] ')
        .replace('⚠️', '[!] ')
        .replace('ℹ️', '[i] ');

    let page = factory.createPage('Score Breakdown & Recommendations');

    const title = document.createElement('div');
    title.className = 'pdf-page-title';
    title.textContent = '規劃評語與建議';
    page = appendMeasuredBlock(factory, page, title, 'Score Breakdown & Recommendations');

    const commentsHeading = createSectionHeading('評估結果');
    page = appendMeasuredBlock(factory, page, commentsHeading, 'Score Breakdown & Recommendations');

    lastScore.comments.forEach(comment => {
        let extraClass = '';
        if (comment.includes('✅')) extraClass = 'pos-border';
        else if (comment.includes('❌') || comment.includes('⚠️')) extraClass = 'neg-border';
        const item = createListItem(normalizeBullet(comment), extraClass);
        page = appendMeasuredBlock(factory, page, item, 'Score Breakdown & Recommendations');
    });

    const recHeading = createSectionHeading('改善建議');
    page = appendMeasuredBlock(factory, page, recHeading, 'Score Breakdown & Recommendations');

    const recs = (lastScore.recommendations && lastScore.recommendations.length)
        ? lastScore.recommendations
        : ['您的財務規劃相當健全。'];
    recs.forEach(rec => {
        const item = createListItem(`- ${normalizeBullet(rec)}`, 'rec-border');
        page = appendMeasuredBlock(factory, page, item, 'Score Breakdown & Recommendations');
    });

    const infoHeading = document.createElement('div');
    infoHeading.className = 'pdf-page-title secondary';
    infoHeading.textContent = '系統數值計算說明';
    page = appendMeasuredBlock(factory, page, infoHeading, 'Calculation Notes');

    infoText.forEach(paragraph => {
        const block = document.createElement('div');
        block.className = 'pdf-desc-block';
        block.textContent = paragraph;
        page = appendMeasuredBlock(factory, page, block, 'Calculation Notes');
    });
}

function createProjectionTableShell(factory, params, continued) {
    const page = factory.createPage(continued ? 'Projection Table (Continued)' : 'Projection Table');

    const title = document.createElement('div');
    title.className = 'pdf-table-title';
    title.textContent = continued ? '資產水位試算表（續）' : '資產水位試算表 — 人生全程預測';
    page.body.appendChild(title);

    const subtitle = document.createElement('div');
    subtitle.className = 'pdf-table-subtitle';
    if (continued) {
        subtitle.textContent = '接續前頁。金額單位為萬元，退休後年份以淡色底標示，負現金流以紅字標示。';
    } else {
        subtitle.textContent = `主要假設：退休年齡 ${params.retirementAge} 歲 ｜ 投資報酬率 ${(params.investmentReturnRate * 100).toFixed(1)}% ｜ 通膨率 ${(params.inflationRate * 100).toFixed(1)}%`;
    }
    page.body.appendChild(subtitle);

    const table = document.createElement('table');
    table.className = 'pdf-main-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th class="w-age">年齡</th>
                <th>年收入</th>
                <th>年支出</th>
                <th>淨現金流</th>
                <th>現金</th>
                <th>投資</th>
                <th>總資產</th>
                <th>剩餘貸款</th>
                <th class="w-note">備註</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    page.body.appendChild(table);

    return { ...page, tbody: table.querySelector('tbody') };
}

function createProjectionRow(result, params) {
    const tr = document.createElement('tr');
    if (result.age >= params.retirementAge) tr.classList.add('retired-row');

    const note = (result.note || '')
        .replace(/[【】]/g, '')
        .replace('⚠️', '!')
        .replace('破產！', '破產')
        .trim();

    const totalLoan = result.remainingMortgage + result.remainingDebt + result.remainingCarLoan;
    const cfClass = result.netCashFlow < 0 ? 'neg-cf' : '';

    tr.innerHTML = `
        <td class="center">${result.age}</td>
        <td>${(result.income / 10000).toFixed(1)}</td>
        <td>${(result.expenses / 10000).toFixed(1)}</td>
        <td class="${cfClass}">${(result.netCashFlow / 10000).toFixed(1)}</td>
        <td>${(result.cashAssets / 10000).toFixed(1)}</td>
        <td>${(result.investedAssets / 10000).toFixed(1)}</td>
        <td class="asset-highlight">${(result.totalAssets / 10000).toFixed(1)}</td>
        <td>${(totalLoan / 10000).toFixed(1)}</td>
        <td class="left note-cell" title="${escapeHtml(note)}">${escapeHtml(note || '—')}</td>
    `;

    return tr;
}

function buildProjectionPages(factory, simResults, params) {
    let current = createProjectionTableShell(factory, params, false);

    simResults.forEach(result => {
        const row = createProjectionRow(result, params);
        current.tbody.appendChild(row);

        if (current.body.scrollHeight <= current.body.clientHeight) return;

        current.tbody.removeChild(row);
        current = createProjectionTableShell(factory, params, true);
        current.tbody.appendChild(row);
    });

    const disclaimer = document.createElement('div');
    disclaimer.className = 'pdf-table-note';
    disclaimer.innerHTML = '本試算表為模擬推估，實際結果會受到市場波動與個人決策影響。剩餘貸款 = 房貸 + 車貸 + 其他負債的年末餘額。';
    current.body.appendChild(disclaimer);

    if (current.body.scrollHeight > current.body.clientHeight) {
        current.body.removeChild(disclaimer);
        current = createProjectionTableShell(factory, params, true);
        current.body.appendChild(disclaimer);
    }
}

function buildPDFStyles() {
    return `
        .pdf-report {
            width: ${PDF_PAGE_WIDTH_PX}px;
            margin: 0 auto;
            background: #ffffff;
            color: #4a4a4a;
            font-family: 'Inter', 'Noto Sans TC', sans-serif;
        }

        .pdf-page {
            width: ${PDF_PAGE_WIDTH_PX}px;
            height: ${PDF_PAGE_HEIGHT_PX}px;
            padding: 40px 50px 56px;
            box-sizing: border-box;
            background: #ffffff;
            page-break-after: always;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .pdf-page:last-child { page-break-after: avoid; }

        .pdf-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-bottom: 2px solid #8c9e82;
            padding-bottom: 15px;
            margin-bottom: 20px;
            flex: 0 0 auto;
        }

        .pdf-header h1 {
            margin: 0;
            font-size: 24px;
            color: #8c9e82;
            font-weight: 700;
            letter-spacing: 0.6px;
        }

        .pdf-header span {
            font-size: 12px;
            color: #7a7a7a;
            font-weight: 500;
        }

        .pdf-body {
            flex: 1 1 auto;
            min-height: 0;
            overflow: hidden;
        }

        .pdf-footer {
            flex: 0 0 auto;
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #a0a0a0;
            border-top: 1px solid #e6e4dc;
            padding-top: 12px;
            margin-top: 16px;
        }

        .pdf-grid-p1 {
            display: grid;
            grid-template-columns: 38% 1fr;
            gap: 20px;
            height: 100%;
        }

        .pdf-col-left,
        .pdf-col-right {
            min-height: 0;
            overflow: hidden;
        }

        .pdf-col-left {
            display: flex;
            flex-direction: column;
            gap: 14px;
        }

        .pdf-col-right {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .pdf-box {
            border: 1px solid #e6e4dc;
            border-radius: 10px;
            background: #faf9f5;
            padding: 12px;
        }

        .pdf-box-title {
            font-size: 13px;
            font-weight: 700;
            color: #8c9e82;
            margin-bottom: 9px;
            border-bottom: 1px solid #e6e4dc;
            padding-bottom: 5px;
        }

        .pdf-param-row {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            margin-bottom: 5px;
            font-size: 11px;
            line-height: 1.3;
        }

        .pdf-param-row:last-child { margin-bottom: 0; }
        .pdf-param-name { color: #7a7a7a; }
        .pdf-param-val { color: #4a4a4a; font-weight: 600; text-align: right; }

        .pdf-score-card {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border: 1px solid #e6e4dc;
            border-radius: 14px;
            background: #ffffff;
            padding: 20px 24px;
        }

        .pdf-score-label {
            font-size: 18px;
            font-weight: 700;
            color: #4a4a4a;
        }

        .pdf-score-num {
            font-size: 46px;
            font-weight: 700;
            line-height: 1;
        }

        .pdf-score-denominator {
            font-size: 18px;
            color: #a0a0a0;
            font-weight: 500;
        }

        .pdf-score-num.high { color: #8c9e82; }
        .pdf-score-num.mid { color: #d9c19c; }
        .pdf-score-num.low { color: #d89b88; }

        .pdf-mini-title {
            font-size: 13px;
            font-weight: 700;
            color: #8c9e82;
        }

        .pdf-stmt-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            border: 1px solid #e6e4dc;
            border-radius: 10px;
            overflow: hidden;
        }

        .pdf-stmt-table th {
            background: #8c9e82;
            color: #ffffff;
            text-align: left;
            padding: 10px 12px;
            font-weight: 600;
        }

        .pdf-stmt-table.is-table th { background: #819c8d; }

        .pdf-stmt-table td {
            padding: 8px 12px;
            border-bottom: 1px solid #e6e4dc;
        }

        .pdf-stmt-table tr:nth-child(even) td { background: #faf9f5; }
        .pdf-stmt-table tr:last-child td { border-bottom: none; }
        .pdf-stmt-table .total-row td { background: rgba(140, 158, 130, 0.08) !important; font-weight: 700; color: #2d3b26; }
        .pdf-stmt-table .pos { color: #819c8d; font-weight: 700; }
        .pdf-stmt-table .neg { color: #d89b88; font-weight: 700; }

        .pdf-metrics-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
        }

        .pdf-metric-item {
            border: 1px solid #e6e4dc;
            border-radius: 10px;
            background: #ffffff;
            padding: 14px 10px;
            text-align: center;
        }

        .pdf-metric-title {
            font-size: 11px;
            color: #7a7a7a;
            font-weight: 600;
            margin-bottom: 6px;
        }

        .pdf-metric-value {
            font-size: 20px;
            color: #8c9e82;
            font-weight: 700;
        }

        .pdf-charts-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }

        .pdf-chart-box {
            border: 1px solid #e6e4dc;
            border-radius: 10px;
            background: #ffffff;
            padding: 12px;
        }

        .pdf-chart-box h3 {
            margin: 0 0 8px;
            text-align: center;
            font-size: 13px;
            font-weight: 700;
            color: #4a4a4a;
        }

        .pdf-chart-box canvas {
            display: block;
            margin: 0 auto;
            max-width: 100%;
        }

        .pdf-trend-box canvas { width: 100%; height: auto; }

        .compact-overview .pdf-grid-p1 { gap: 16px; }
        .compact-overview .pdf-col-left { gap: 10px; }
        .compact-overview .pdf-box { padding: 10px; }
        .compact-overview .pdf-box-title { font-size: 12px; margin-bottom: 6px; }
        .compact-overview .pdf-param-row { font-size: 10px; margin-bottom: 3px; }
        .compact-overview .pdf-score-card { padding: 16px 20px; }
        .compact-overview .pdf-score-label { font-size: 16px; }
        .compact-overview .pdf-score-num { font-size: 40px; }
        .compact-overview .pdf-stmt-table { font-size: 11px; }
        .compact-overview .pdf-stmt-table th,
        .compact-overview .pdf-stmt-table td { padding-top: 7px; padding-bottom: 7px; }
        .compact-overview .pdf-metric-title { font-size: 10px; }
        .compact-overview .pdf-metric-value { font-size: 18px; }
        .compact-overview .pdf-chart-box h3 { font-size: 12px; }

        .pdf-page-title {
            font-size: 22px;
            font-weight: 700;
            color: #8c9e82;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e6e4dc;
        }

        .pdf-page-title.secondary { margin-top: 16px; }

        .pdf-section-heading {
            font-size: 14px;
            font-weight: 700;
            color: #8c9e82;
            margin: 4px 0 8px;
        }

        .pdf-list-item {
            list-style: none;
            font-size: 14px;
            padding: 13px 16px;
            margin-bottom: 10px;
            background: #ffffff;
            border: 1px solid #e6e4dc;
            border-left: 5px solid #8c9e82;
            border-radius: 10px;
            line-height: 1.55;
        }

        .pdf-list-item.pos-border { border-left-color: #8c9e82; color: #5c6e52; }
        .pdf-list-item.neg-border { border-left-color: #d89b88; color: #c47660; }
        .pdf-list-item.rec-border { border-left-color: #d9c19c; }

        .pdf-desc-block {
            font-size: 13px;
            line-height: 1.75;
            color: #5a5a5a;
            background: #faf9f5;
            border: 1px solid #e6e4dc;
            border-radius: 10px;
            padding: 16px;
            margin-bottom: 10px;
            white-space: pre-wrap;
        }

        .pdf-table-title {
            font-size: 22px;
            font-weight: 700;
            text-align: center;
            color: #4a4a4a;
            margin-bottom: 8px;
        }

        .pdf-table-subtitle {
            font-size: 12px;
            text-align: center;
            color: #7a7a7a;
            margin-bottom: 16px;
            line-height: 1.5;
        }

        .pdf-main-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 10.5px;
            border: 1px solid #e6e4dc;
        }

        .pdf-main-table th {
            background: #8c9e82;
            color: #ffffff;
            font-weight: 600;
            padding: 8px 5px;
            text-align: right;
            line-height: 1.2;
        }

        .pdf-main-table th.w-age,
        .pdf-main-table td.center { text-align: center; width: 7%; }

        .pdf-main-table th.w-note { text-align: left; width: 16%; }

        .pdf-main-table td {
            padding: 7px 5px;
            border-bottom: 1px solid #e6e4dc;
            text-align: right;
            color: #4a4a4a;
            line-height: 1.2;
        }

        .pdf-main-table td.left { text-align: left; }
        .pdf-main-table td.asset-highlight { font-weight: 700; color: #8c9e82; }
        .pdf-main-table tr.retired-row td { background: rgba(129, 156, 141, 0.08); }
        .pdf-main-table tr:nth-child(even):not(.retired-row) td { background: #faf9f5; }
        .pdf-main-table tr:last-child td { border-bottom: none; }
        .pdf-main-table .neg-cf { color: #d89b88; font-weight: 700; }

        .note-cell {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .pdf-table-note {
            font-size: 11px;
            color: #8a8a8a;
            line-height: 1.6;
            margin-top: 12px;
        }
    `;
}

async function exportToPDF(simResults, lastScore, params) {
    if (typeof html2pdf === 'undefined') {
        showToast('PDF 套件載入中，請稍後再試。', 'info');
        const script = document.createElement('script');
        script.src = 'html2pdf.bundle.min.js';
        script.onload = () => showToast('PDF 套件已載入，請再次點擊匯出。', 'success');
        document.head.appendChild(script);
        return;
    }

    showToast('正在產生 PDF 報告，請稍候...', 'info');

    const printContainer = createPDFContainer();
    const reportRoot = document.createElement('div');
    reportRoot.className = 'pdf-report';

    const style = document.createElement('style');
    style.textContent = buildPDFStyles();
    reportRoot.appendChild(style);
    printContainer.appendChild(reportRoot);

    const factory = createPageFactory(reportRoot);
    buildOverviewPage(factory, simResults, lastScore, params);
    buildScorePages(factory, lastScore);
    buildProjectionPages(factory, simResults, params);

    try {
        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
        }
        await waitForStableLayout();
        await renderPDFCharts(simResults, params);
        await waitForStableLayout();

        const scale = Math.min(3, Math.max(2, window.devicePixelRatio || 2));
        const pageNodes = Array.from(reportRoot.querySelectorAll('.pdf-page'));
        if (!pageNodes.length) {
            throw new Error('No PDF pages were generated.');
        }
        const worker = html2pdf().set({
            margin: 0,
            filename: PDF_FILENAME,
            image: { type: 'jpeg', quality: 0.98 },
            pagebreak: { mode: [] },
            html2canvas: {
                scale,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                scrollX: 0,
                scrollY: 0,
                x: 0,
                y: 0,
                width: PDF_PAGE_WIDTH_PX,
                height: PDF_PAGE_HEIGHT_PX,
                windowWidth: PDF_PAGE_WIDTH_PX,
                windowHeight: PDF_PAGE_HEIGHT_PX
            },
            jsPDF: {
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait',
                compress: true
            }
        });

        await worker.from(pageNodes[0]).toPdf();
        for (let index = 1; index < pageNodes.length; index += 1) {
            await worker.from(pageNodes[index]).toCanvas().toPdf();
        }
        await worker.save();

        showToast('PDF 報告下載成功。', 'success');
    } catch (err) {
        console.error(err);
        showToast('PDF 產生失敗，請重試。', 'error');
    } finally {
        printContainer.remove();
    }
}

async function renderPDFCharts(simResults, params) {
    const nowRes = simResults.find(r => r.age === params.currentAge) || simResults[0];
    if (!nowRes) return;

    const flowCanvas = document.getElementById('pdf-pie-flow');
    const assetCanvas = document.getElementById('pdf-pie-asset');
    const trendCanvas = document.getElementById('pdf-trend-chart');
    if (!flowCanvas || !assetCanvas || !trendCanvas) return;

    const surplus = Math.max(
        0,
        nowRes.income -
        (nowRes.livingExpense * 12 +
            nowRes.travelExpense * 12 +
            nowRes.mortgageExpense * 12 +
            nowRes.debtExpense * 12 +
            nowRes.carExpense * 12 +
            nowRes.customExpense * 12 +
            nowRes.tax)
    );

    const monthlyItems = [
        ['生活費', nowRes.livingExpense],
        ['旅遊', nowRes.travelExpense],
        ['房貸', nowRes.mortgageExpense],
        ['債務', nowRes.debtExpense],
        ['車貸', nowRes.carExpense],
        ['其他', nowRes.customExpense],
        ['稅收', nowRes.tax / 12],
        ['結餘', surplus / 12]
    ];

    const flowLabels = [];
    const flowData = [];
    monthlyItems.forEach(([label, value]) => {
        if (value > 0) {
            flowLabels.push(label);
            flowData.push(value);
        }
    });

    new Chart(flowCanvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: flowLabels,
            datasets: [{
                data: flowData,
                backgroundColor: ['#8c9e82', '#e4dbc5', '#d89b88', '#c4cbcf', '#a8b89f', '#d9c19c', '#9eb0a8', '#f2d6c9'],
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            animation: false,
            responsive: false,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { size: 10 },
                        padding: 10,
                        usePointStyle: true
                    }
                }
            }
        }
    });

    const assetLabels = [];
    const assetData = [];
    if (nowRes.cashAssets > 0) {
        assetLabels.push('現金存款');
        assetData.push(nowRes.cashAssets);
    }
    if (nowRes.investedAssets > 0) {
        assetLabels.push('投資組合');
        assetData.push(nowRes.investedAssets);
    }

    new Chart(assetCanvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: assetLabels,
            datasets: [{
                data: assetData,
                backgroundColor: ['#a8b89f', '#d9c19c'],
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            animation: false,
            responsive: false,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { size: 10 },
                        padding: 10,
                        usePointStyle: true
                    }
                }
            }
        }
    });

    const ages = simResults.map(r => r.age);
    const totalAssets = simResults.map(r => r.totalAssets / 10000);
    const invested = simResults.map(r => r.investedAssets / 10000);
    const cashAssets = simResults.map(r => r.cashAssets / 10000);

    const annotations = {};
    const seen = new Set();
    simResults.forEach(result => {
        if (!result.note || seen.has(result.age)) return;
        if (!/(買房|買車|退休|破產)/.test(result.note)) return;

        const label = result.note.replace(/[【】]/g, '').split(':')[0].trim().slice(0, 4);
        annotations[`evt_${result.age}`] = {
            type: 'point',
            xValue: result.age,
            yValue: result.totalAssets / 10000,
            backgroundColor: '#d9c19c',
            radius: 4,
            borderColor: '#ffffff',
            borderWidth: 2,
            label: {
                display: true,
                content: label,
                color: '#4a4a4a',
                backgroundColor: 'rgba(255,255,255,0.9)',
                borderRadius: 4,
                font: { size: 10, weight: 'bold' },
                position: 'top',
                padding: 4
            }
        };
        seen.add(result.age);
    });

    new Chart(trendCanvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: ages,
            datasets: [
                {
                    label: '總資產 (萬)',
                    data: totalAssets,
                    borderColor: '#8c9e82',
                    backgroundColor: '#8c9e82',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.3,
                    fill: false
                },
                {
                    label: '投資 (萬)',
                    data: invested,
                    borderColor: '#d9c19c',
                    backgroundColor: 'rgba(217, 193, 156, 0.22)',
                    borderWidth: 1,
                    pointRadius: 0,
                    tension: 0.3,
                    fill: true
                },
                {
                    label: '現金 (萬)',
                    data: cashAssets,
                    borderColor: '#819c8d',
                    backgroundColor: 'rgba(129, 156, 141, 0.18)',
                    borderWidth: 1,
                    pointRadius: 0,
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            animation: false,
            responsive: false,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: { size: 10 },
                        usePointStyle: true,
                        padding: 10
                    }
                },
                annotation: { annotations }
            },
            scales: {
                x: {
                    ticks: { font: { size: 10 } },
                    grid: { display: false }
                },
                y: {
                    ticks: { font: { size: 10 } },
                    grid: { color: 'rgba(0, 0, 0, 0.04)' }
                }
            }
        }
    });
}
