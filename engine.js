/**
 * 人生財務規劃模擬器 — 核心計算引擎 (engine.js)
 * 完整移植自 Python core/ 模組
 */

// ============================================================
// EventManager
// ============================================================
class EventManager {
    constructor() { this.events = []; }
    addEvent(age, name, cost) { this.events.push({ age, name, cost }); }
    getEventsForAge(age) { return this.events.filter(e => e.age === age); }
    getTotalCostForAge(age) { return this.getEventsForAge(age).reduce((s, e) => s + e.cost, 0); }
}

// ============================================================
// Mortgage helpers
// ============================================================
function calcMortgageDetails(totalPrice, downRatio) {
    const downPayment = totalPrice * downRatio;
    return { downPayment, loanAmount: totalPrice - downPayment };
}

function calcMonthlyPayment(principal, annualRate, totalYears, graceYears = 0) {
    if (principal <= 0 || totalYears <= 0) return { grace: 0, normal: 0 };
    const mr = annualRate > 0 ? annualRate / 12 : 0;
    const graceMonthly = (graceYears > 0 && mr > 0) ? principal * mr : 0;
    const repayYears = totalYears - graceYears;
    if (repayYears <= 0) return { grace: graceMonthly, normal: 0 };
    const months = repayYears * 12;
    const normal = mr === 0
        ? principal / months
        : principal * (mr * Math.pow(1 + mr, months)) / (Math.pow(1 + mr, months) - 1);
    return { grace: graceMonthly, normal };
}

// ============================================================
// Taiwan Income Tax
// ============================================================
function calcTaiwanTax(gross, exemption = 101000, stdDed = 136000, salDed = 227000) {
    const taxable = Math.max(0, gross - exemption - stdDed - salDed);
    if (taxable <= 0) return 0;
    let tax;
    if      (taxable <= 560000)  tax = taxable * 0.05;
    else if (taxable <= 1260000) tax = taxable * 0.12 - 39200;
    else if (taxable <= 2520000) tax = taxable * 0.20 - 140000;
    else if (taxable <= 4720000) tax = taxable * 0.30 - 392000;
    else                         tax = taxable * 0.40 - 864000;
    return Math.max(0, tax);
}

// ============================================================
// Goal Planner
// ============================================================
function calcRequiredMonthlyInvestment(targetAmount, years, annualReturn, currentInv = 0) {
    if (years <= 0) return 0;
    const months = years * 12;
    if (annualReturn <= 0) return Math.max(0, (targetAmount - currentInv) / months);
    const mr = annualReturn / 12;
    const pvFV = currentInv * Math.pow(1 + mr, months);
    const shortfall = targetAmount - pvFV;
    if (shortfall <= 0) return 0;
    return shortfall * mr / (Math.pow(1 + mr, months) - 1);
}

// ============================================================
// Simulator
// ============================================================
class Simulator {
    constructor(p) {
        this.currentAge           = p.currentAge;
        this.retirementAge        = p.retirementAge;
        this.lifeExpectancy       = p.lifeExpectancy;
        this.currentCash          = p.currentCash;
        this.currentInvestments   = p.currentInvestments;
        this.monthlyIncome        = p.monthlyIncome;
        this.annualBonusMonths    = p.annualBonusMonths;
        this.incomeGrowthRate     = p.incomeGrowthRate;
        this.monthlyLivingExpenses= p.monthlyLivingExpenses;
        this.annualTravelExpenses = p.annualTravelExpenses;
        this.monthlyDebtRepayment = p.monthlyDebtRepayment || 0;
        this.debtYears            = p.debtYears || 0;
        this.debtAmount           = p.debtAmount || 0;
        this.debtRate             = p.debtRate || 0;
        this.inflationRate        = p.inflationRate;
        this.investmentReturnRate = p.investmentReturnRate;
        this.investmentRatio      = p.investmentRatio;
        this.mortgageStartAge     = p.mortgageStartAge || 0;
        this.mortgageHousePrice   = p.mortgageHousePrice || 0;
        this.mortgageDownRatio    = p.mortgageDownRatio || 0.2;
        this.mortgageYears        = p.mortgageYears || 30;
        this.mortgageGraceYears   = p.mortgageGraceYears || 0;
        this.mortgageRate         = p.mortgageRate || 0;
        this.mortgageOtherFees    = p.mortgageOtherFees || 0;
        this.carStartAge          = p.carStartAge || 0;
        this.carPrice             = p.carPrice || 0;
        this.carDownRatio         = p.carDownRatio || 0;
        this.carLoanYears         = p.carLoanYears || 0;
        this.carLoanRate          = p.carLoanRate || 0;
        this.ce1Name              = p.ce1Name || '';
        this.ce1Age               = p.ce1Age || 0;
        this.ce1Amount            = p.ce1Amount || 0;
        this.ce1Months            = p.ce1Months || 0;
        this.ce2Name              = p.ce2Name || '';
        this.ce2Age               = p.ce2Age || 0;
        this.ce2Amount            = p.ce2Amount || 0;
        this.ce2Months            = p.ce2Months || 0;
        this.taxExemption         = p.taxExemption || 101000;
        this.taxStdDeduction      = p.taxStdDeduction || 136000;
        this.taxSalDeduction      = p.taxSalDeduction || 227000;
        this.results = [];
    }

    run() {
        let cash = this.currentCash;
        let inv  = this.currentInvestments;
        let mInc = this.monthlyIncome;
        let mLiv = this.monthlyLivingExpenses;
        let travel = this.annualTravelExpenses;

        const { downPayment, loanAmount: principal } = calcMortgageDetails(this.mortgageHousePrice, this.mortgageDownRatio);
        const { grace: graceM, normal: normalM } = calcMonthlyPayment(principal, this.mortgageRate, this.mortgageYears, this.mortgageGraceYears);
        const mortgageEndAge = this.mortgageStartAge + this.mortgageYears;
        const graceEndAge    = this.mortgageStartAge + this.mortgageGraceYears;

        let remMortgage = 0, remCar = 0, remDebt = this.debtAmount;
        const em = new EventManager();
        this.results = [];

        for (let age = this.currentAge; age <= this.lifeExpectancy; age++) {
            let note = '';

            // 1. Income
            let income = 0;
            if (age < this.retirementAge) {
                income = mInc * 12 + mInc * this.annualBonusMonths;
            } else if (age === this.retirementAge) {
                note += '【退休】';
            }

            // 2. Mortgage
            let mortgageExp = 0;
            if (this.mortgageStartAge > 0) {
                if (age === this.mortgageStartAge) {
                    note += `【買房: 扣頭期款 ${(downPayment/10000).toFixed(0)}萬`;
                    em.addEvent(age, '買房頭期款', downPayment);
                    if (this.mortgageOtherFees > 0) {
                        note += `，裝潢等費用 ${(this.mortgageOtherFees/10000).toFixed(0)}萬`;
                        em.addEvent(age, '買房裝潢等費用', this.mortgageOtherFees);
                    }
                    note += '】';
                    remMortgage = principal;
                }
                if (this.mortgageStartAge <= age && age < graceEndAge) {
                    mortgageExp = graceM * 12;
                    remMortgage = principal;
                } else if (graceEndAge <= age && age < mortgageEndAge) {
                    mortgageExp = normalM * 12;
                    const mr = this.mortgageRate > 0 ? this.mortgageRate / 12 : 0;
                    for (let m = 0; m < 12; m++) {
                        const interest = remMortgage * mr;
                        remMortgage -= (normalM - interest);
                    }
                    if (remMortgage < 0) remMortgage = 0;
                } else if (age === mortgageEndAge) {
                    remMortgage = 0;
                }
            }

            // 3. Debt
            let debtExp = 0;
            if (age < this.currentAge + this.debtYears) {
                debtExp = this.monthlyDebtRepayment * 12;
                const dr = this.debtRate > 0 ? this.debtRate / 12 : 0;
                for (let m = 0; m < 12; m++) {
                    const interest = remDebt * dr;
                    remDebt -= (this.monthlyDebtRepayment - interest);
                }
                if (remDebt < 0) remDebt = 0;
            } else {
                remDebt = 0;
            }

            // 4. Car
            let carExp = 0;
            if (this.carStartAge > 0) {
                const carDown = this.carPrice * this.carDownRatio;
                const carLoan = this.carPrice - carDown;
                if (age === this.carStartAge) {
                    note += `【買車: 扣頭期款 ${(carDown/10000).toFixed(0)}萬】`;
                    em.addEvent(age, '買車頭期款', carDown);
                    remCar = carLoan;
                }
                if (this.carStartAge <= age && age < this.carStartAge + this.carLoanYears) {
                    const { normal: carM } = calcMonthlyPayment(carLoan, this.carLoanRate, this.carLoanYears, 0);
                    carExp = carM * 12;
                    const cr = this.carLoanRate > 0 ? this.carLoanRate / 12 : 0;
                    for (let m = 0; m < 12; m++) {
                        remCar -= (carM - remCar * cr);
                    }
                    if (remCar < 0) remCar = 0;
                } else if (age === this.carStartAge + this.carLoanYears) {
                    remCar = 0;
                }
            }

            // 5. Custom Expenses
            let ceExp = 0;
            if (this.ce1Age > 0 && this.ce1Amount > 0) {
                if (this.ce1Months <= 1) {
                    if (age === this.ce1Age) {
                        note += `【${this.ce1Name}: ${(this.ce1Amount/10000).toFixed(0)}萬】`;
                        em.addEvent(age, this.ce1Name, this.ce1Amount);
                    }
                } else {
                    const mp = (age - this.ce1Age) * 12;
                    if (mp >= 0 && mp < this.ce1Months) {
                        const activeM = Math.min(12, this.ce1Months - mp);
                        const ceAnn = (this.ce1Amount / this.ce1Months) * activeM;
                        note += `【${this.ce1Name} 分期: ${(ceAnn/10000).toFixed(1)}萬】`;
                        ceExp += ceAnn;
                    }
                }
            }
            if (this.ce2Age > 0 && this.ce2Amount > 0) {
                if (this.ce2Months <= 1) {
                    if (age === this.ce2Age) {
                        note += `【${this.ce2Name}: ${(this.ce2Amount/10000).toFixed(0)}萬】`;
                        em.addEvent(age, this.ce2Name, this.ce2Amount);
                    }
                } else {
                    const mp = (age - this.ce2Age) * 12;
                    if (mp >= 0 && mp < this.ce2Months) {
                        const activeM = Math.min(12, this.ce2Months - mp);
                        const ceAnn = (this.ce2Amount / this.ce2Months) * activeM;
                        note += `【${this.ce2Name} 分期: ${(ceAnn/10000).toFixed(1)}萬】`;
                        ceExp += ceAnn;
                    }
                }
            }

            // 6. Tax
            const tax = calcTaiwanTax(income, this.taxExemption, this.taxStdDeduction, this.taxSalDeduction);
            const annualLiving = mLiv * 12;
            const eventExp = em.getTotalCostForAge(age);
            const totalExp = annualLiving + travel + mortgageExp + debtExp + carExp + ceExp + eventExp + tax;

            // 7. Cash Flow & Assets
            const netCF = income - totalExp;
            const invGain = inv * this.investmentReturnRate;
            inv += invGain;

            if (netCF > 0) {
                inv  += netCF * this.investmentRatio;
                cash += netCF * (1 - this.investmentRatio);
            } else {
                const deficit = -netCF;
                if (cash >= deficit) {
                    cash -= deficit;
                } else {
                    inv -= (deficit - cash);
                    cash = 0;
                }
            }

            if (cash + inv <= 0) note += '⚠️ 破產！';

            this.results.push({
                age, income, expenses: totalExp, netCashFlow: netCF,
                investedAssets: inv, cashAssets: cash, totalAssets: cash + inv,
                note, invGain,
                livingExpense: annualLiving / 12,
                travelExpense: travel / 12,
                mortgageExpense: mortgageExp / 12,
                debtExpense: debtExp / 12,
                carExpense: carExp / 12,
                customExpense: ceExp / 12,
                tax,
                remainingMortgage: remMortgage,
                remainingDebt: remDebt,
                remainingCarLoan: remCar
            });

            // 8. Inflation & Growth
            mLiv   *= (1 + this.inflationRate);
            travel *= (1 + this.inflationRate);
            if (age < this.retirementAge - 1) mInc *= (1 + this.incomeGrowthRate);
        }

        return this.results;
    }

    calculateScore() {
        if (!this.results.length) return { score: 0, comments: [], recommendations: [] };
        let score = 100;
        const comments = [], recs = [];

        const bankruptRes = this.results.find(r => r.totalAssets <= 0);
        if (bankruptRes) {
            const penalty = Math.min(80, (this.lifeExpectancy - bankruptRes.age + 1) * 2);
            score -= penalty;
            comments.push(`❌ 破產危機 (-${penalty}分): 預計在 ${bankruptRes.age} 歲時破產！`);
            recs.push('建議延後退休、減少大筆開銷，或提高儲蓄投資比例。');
            if (score < 10) score = 10;
        } else {
            comments.push('✅ 無破產風險: 終身現金流為正。');
        }

        const finalAssets = this.results[this.results.length - 1].totalAssets;
        if (finalAssets < 1000000) {
            score -= 20;
            comments.push('⚠️ 晚年資產不足 (-20分): 預期壽命時總資產低於 100 萬。');
            recs.push('增加初始存錢計畫，或選擇較高獲利的投資組合。');
        } else if (finalAssets < 5000000) {
            score -= 10;
            comments.push('⚠️ 晚年資產偏低 (-10分): 預期壽命時總資產低於 500 萬。');
            recs.push('可適當提高每月投資金額以確保更安穩的老年生活。');
        } else {
            comments.push('✅ 晚年資產充裕: 足以應付突發醫療等開銷。');
        }

        const negPre = this.results.filter(r => r.netCashFlow < 0 && r.age < this.retirementAge).length;
        const cfPenalty = Math.min(20, negPre * 2);
        if (cfPenalty > 0) {
            score -= cfPenalty;
            comments.push(`⚠️ 退休前現金流赤字 (-${cfPenalty}分): 退休前共有 ${negPre} 年入不敷出。`);
            recs.push(`建議在 ${this.retirementAge} 歲前控制開銷或提高收入。`);
        } else {
            comments.push('✅ 退休前收支健康: 退休前保持良好的儲蓄習慣。');
        }

        const nowRes = this.results.find(r => r.age === this.currentAge);
        if (nowRes) {
            const mExp = nowRes.expenses > 0 ? nowRes.expenses / 12 : 1;
            const efM = nowRes.cashAssets / mExp;
            if (efM < 3) {
                score -= 10;
                comments.push(`⚠️ 緊急預備金不足 (-10分): 目前現金僅夠支撐 ${efM.toFixed(1)} 個月開銷。`);
                recs.push('建議優先將現金存至 6 個月生活費的水平。');
            } else if (efM >= 6) {
                comments.push(`✅ 緊急預備金充足: 現金水位足以支撐 ${efM.toFixed(1)} 個月。`);
            } else {
                comments.push(`ℹ️ 緊急預備金尚可: 現金可支撐 ${efM.toFixed(1)} 個月。`);
            }
        }

        let maxDR = 0;
        for (const r of this.results) {
            const liab = r.remainingMortgage + r.remainingDebt + r.remainingCarLoan;
            if (r.totalAssets > 0) maxDR = Math.max(maxDR, liab / r.totalAssets);
        }
        if (maxDR > 1.2) {
            score -= 10;
            comments.push(`❌ 負債比極高 (-10分): 最高負債比達 ${(maxDR*100).toFixed(1)}%。`);
            recs.push('強烈建議降低房貸或車貸負擔。');
        } else if (maxDR > 0.8) {
            score -= 5;
            comments.push(`⚠️ 負債比偏高 (-5分): 最高負債比達 ${(maxDR*100).toFixed(1)}%。`);
            recs.push('債務占比偏大，請確保收入穩定。');
        } else {
            comments.push('✅ 負債比健康: 財務槓桿在安全範圍內。');
        }

        return { score: Math.max(10, Math.min(100, Math.floor(score))), comments, recommendations: [...new Set(recs)] };
    }
}
