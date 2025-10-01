document.getElementById('calculate').addEventListener('click', function () {
    const calcType = document.getElementById('calc-type').value;
    const x = parseFloat(document.getElementById('input-x').value);
    const y = parseFloat(document.getElementById('input-y').value);
    let resultText = "";

    if (isNaN(x) || (isNaN(y) && calcType !== "percent-of")) {
        resultText = "Please enter valid numbers for X and Y.";
        document.getElementById('result').textContent = resultText;
        return;
    }

    switch (calcType) {
        case 'percent-of':
            resultText = `${x}% of ${y} is ${(x / 100 * y).toFixed(2)}`;
            break;
        case 'increase-by':
            resultText = `${y} increased by ${x}% is ${(y + (x / 100 * y)).toFixed(2)}`;
            break;
        case 'decrease-by':
            resultText = `${y} decreased by ${x}% is ${(y - (x / 100 * y)).toFixed(2)}`;
            break;
        case 'percent-diff':
            if (y === 0) {
                resultText = "Percent difference is undefined when Y is zero.";
            } else {
                resultText = `Percent difference between ${x} and ${y} is ${Math.abs(x - y) / ((x + y) / 2) * 100 .toFixed(2)}%`;
            }
            break;
        case 'what-percent':
            if (y === 0) {
                resultText = "Cannot divide by zero.";
            } else {
                resultText = `${x} is ${(x / y * 100).toFixed(2)}% of ${y}`;
            }
            break;
        default:
            resultText = "Invalid calculation selected.";
    }

    document.getElementById('result').textContent = resultText;
});