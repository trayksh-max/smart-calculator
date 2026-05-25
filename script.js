/**
 * NovaCalc - The Next-Gen Smart Calculator (Genius Edition)
 * Features: Algebraic Substitution, Symbolic Simplification, and educational breakdowns.
 */

let currentExpression = "";
let currentResult = "0";
let isAlgebraMode = false;
let history = [];
let variableRules = {}; // e.g., { y: "2x" }

// Elements
const expressionEl = document.getElementById('expression');
const resultEl = document.getElementById('result');
const historyListEl = document.getElementById('history-list');
const breakdownPanel = document.getElementById('breakdown-panel');
const breakdownContent = document.getElementById('breakdown-content');
const modeToggle = document.getElementById('mode-toggle');
const modeLabel = document.getElementById('mode-label');
const ruleInput = document.getElementById('rule-input');
const addRuleBtn = document.getElementById('add-rule-btn');
const rulesListEl = document.getElementById('rules-list');
const clearRulesBtn = document.getElementById('clear-rules');

// Initialize
modeToggle.addEventListener('change', () => {
    isAlgebraMode = modeToggle.checked;
    modeLabel.innerText = isAlgebraMode ? "Algebra Mode" : "Standard Mode";
    clearAll();
});

// Rule Management
addRuleBtn.onclick = () => {
    const val = ruleInput.value.trim();
    if (!val) return;

    // Expected: "y = 2x"
    const parts = val.split('=');
    if (parts.length === 2) {
        const varName = parts[0].trim();
        const expression = parts[1].trim();
        variableRules[varName] = expression;
        updateRulesUI();
        ruleInput.value = "";
    } else {
        alert("Please use format: y = 2x");
    }
};

function updateRulesUI() {
    rulesListEl.innerHTML = '';
    for (let v in variableRules) {
        const item = document.createElement('div');
        item.className = 'rule-item';
        item.innerHTML = `<span>${v} = ${variableRules[v]}</span>`;
        rulesListEl.appendChild(item);
    }
}

clearRulesBtn.onclick = () => {
    variableRules = {};
    updateRulesUI();
};

// Keyboard Support
window.addEventListener('keydown', (e) => {
    const key = e.key;
    if (/[0-9]/.test(key)) appendNumber(key);
    else if (key === '.') appendNumber('.');
    else if (key === '+') appendOperator('+');
    else if (key === '-') appendOperator('-');
    else if (key === '*') appendOperator('*');
    else if (key === '/') appendOperator('/');
    else if (key === '%') appendOperator('%');
    else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        calculate();
    } else if (key === 'Backspace') deleteLast();
    else if (key === 'Escape') clearAll();
});

function appendNumber(num) {
    if (currentResult === "0" && currentExpression === "") {
        currentExpression = num;
    } else {
        currentExpression += num;
    }
    updateDisplay();
}

function appendOperator(op) {
    if (currentExpression === "" && op !== '-') return;
    const lastChar = currentExpression.slice(-1);
    if (['+', '-', '*', '/', '%'].includes(lastChar)) {
        currentExpression = currentExpression.slice(0, -1);
    }
    currentExpression += op;
    updateDisplay();
}

function clearAll() {
    currentExpression = "";
    currentResult = "0";
    updateDisplay();
    closeBreakdown();
}

function deleteLast() {
    currentExpression = currentExpression.slice(0, -1);
    updateDisplay();
}

function updateDisplay() {
    expressionEl.innerText = currentExpression;
    resultEl.innerText = currentResult;
}

function calculate() {
    if (currentExpression === "") return;

    try {
        if (isAlgebraMode) {
            solveGenius(currentExpression);
        } else {
            solveStandard(currentExpression);
        }
    } catch (error) {
        console.error(error);
        currentResult = "Error";
        updateDisplay();
    }
}

function solveStandard(expr) {
    const sanitized = expr.replace(/×/g, '*').replace(/÷/g, '/');
    const result = eval(sanitized);
    currentResult = Number.isInteger(result) ? result : result.toFixed(4);
    updateDisplay();
    addToHistory(expr, currentResult);
    showBreakdown(expr, currentResult);
}

function solveGenius(expr) {
    // Split equation by '='
    const parts = expr.split('=');
    let equation = expr;
    let rightSide = null;

    if (parts.length === 2) {
        equation = parts[0].trim();
        rightSide = parts[1].trim();
    }

    // 1. Substitution Phase
    let substitutedExpr = equation;
    let substitutionSteps = [];

    for (let v in variableRules) {
        const rule = variableRules[v];
        if (substitutedExpr.includes(v)) {
            substitutionSteps.push(`Substituting <strong class="highlight">${v}</strong> with <strong class="highlight">${rule}</strong>`);
            // Use mathjs to replace variable with expression in parentheses
            substitutedExpr = substitutedExpr.split(v).join(`(${rule})`);
        }
    }

    // 2. Simplification Phase using math.js
    let simplified;
    try {
        simplified = math.simplify(substitutedExpr).toString();
    } catch (e) {
        simplified = substitutedExpr;
    }

    // 3. Solving Phase
    // If it's a full equation (rightSide exists), we move everything to one side
    let finalResult;
    let solveSteps = [];

    if (rightSide !== null) {
        const fullEq = `${substitutedExpr} = ${rightSide}`;
        // We calculate the a and b for a simplified ax = b if possible
        // For this "Genius" demo, we will simplify the left and solve numerically if it's a simple linear x
        try {
            // Basic linear solve: isolate x
            const left = math.simplify(substitutedExpr);
            const res = solveLinear(left, rightSide);
            finalResult = res;
            solveSteps.push(`Simplified the equation to isolate x.`);
            solveSteps.push(`The resulting value for x is <strong class="highlight">${finalResult}</strong>`);
        } catch (e) {
            finalResult = "Complex Solution";
            solveSteps.push("This is a non-linear equation. It requires advanced calculus!");
        }
    } else {
        // Just evaluate the expression
        finalResult = math.evaluate(substitutedExpr);
        solveSteps.push(`Evaluated the simplified expression.`);
    }

    currentResult = finalResult;
    updateDisplay();
    addToHistory(expr, finalResult);
    showGeniusBreakdown(expr, substitutionSteps, simplified, solveSteps, finalResult);
}

// Helper to solve basic linear equations like 9x = 18
function solveLinear(leftNode, rightValue) {
    const simplified = math.simplify(leftNode).toString();
    // Match pattern "num * x" or "x"
    const match = simplified.match(/^([-+]?[\d\.]*)?x$/);
    if (match) {
        let coeff = match[1];
        if (!coeff || coeff === '+') coeff = 1;
        else if (coeff === '-') coeff = -1;
        else coeff = parseFloat(coeff);

        return (parseFloat(rightValue) / coeff).toFixed(4);
    }

    // For more complex things, we return the simplified string
    return `Simplified: ${simplified}`;
}

function addToHistory(expr, res) {
    history.push({ expr, res });
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `<span class="expr">${expr}</span><span class="res">${res}</span>`;
    item.onclick = () => {
        currentExpression = expr;
        currentResult = res;
        updateDisplay();
    };
    if (historyListEl.querySelector('.history-placeholder')) {
        historyListEl.innerHTML = '';
    }
    historyListEl.prepend(item);
}

document.getElementById('clear-history').onclick = () => {
    history = [];
    historyListEl.innerHTML = '<div class="history-placeholder">No calculations yet. Start crunching numbers!</div>';
};

function showBreakdown(expr, res) {
    breakdownPanel.classList.add('active');
    let steps = [
        `You entered the expression: <strong class="highlight">${expr}</strong>`,
        `Step 1: Identified the math operation.`,
        `Step 2: Computed the final value.`,
        `<strong>Final Result: ${res}</strong>`
    ];
    renderSteps(steps);
}

function showGeniusBreakdown(original, subSteps, simplified, solveSteps, result) {
    breakdownPanel.classList.add('active');
    let steps = [];

    steps.push(`Genius Mode Analysis for: <strong class="highlight">${original}</strong>`);

    if (subSteps.length > 0) {
        steps.push(`<strong>Phase 1: Substitution</strong>`);
        steps = steps.concat(subSteps);
    } else {
        steps.push(`No substitutions needed.`);
    }

    steps.push(`<strong>Phase 2: Simplification</strong>`);
    steps.push(`The expression simplifies to: <strong class="highlight">${simplified}</strong>`);

    steps.push(`<strong>Phase 3: Solving</strong>`);
    steps = steps.concat(solveSteps);

    steps.push(`<strong class="highlight">Final Result: ${result}</strong>`);

    renderSteps(steps);
}

function renderSteps(steps) {
    breakdownContent.innerHTML = '';
    steps.forEach((text, i) => {
        const div = document.createElement('div');
        div.className = 'step';
        div.innerHTML = `<span class="step-num">${i + 1}.</span> ${text}`;
        breakdownContent.appendChild(div);
    });
}

function closeBreakdown() {
    breakdownPanel.classList.remove('active');
}
