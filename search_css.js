const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\Spud\\Wellness\\wellness-app\\src\\app\\globals.css', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
    if (line.includes('admin-') || line.includes('admin ') || line.includes('.admin')) {
        console.log(`Line ${idx + 1}: ${line}`);
    }
});
