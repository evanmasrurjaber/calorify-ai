const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'MealLog', 'MealLog.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const replacements = [
  // Typography
  [/text-white/g, 'text-gray-900'],
  [/text-gray-400/g, 'text-gray-500'],
  [/text-gray-300/g, 'text-gray-700'],
  [/text-gray-600/g, 'text-gray-400'], // muted text
  
  // Backgrounds
  [/bg-gray-900\/60 backdrop-blur-xl border border-gray-800/g, 'bg-white border border-gray-100 shadow-sm'],
  [/bg-gray-900\/70/g, 'bg-gray-50'],
  [/bg-gray-800\/60/g, 'bg-white'],
  [/bg-gray-800\/40/g, 'bg-gray-50'],
  [/bg-gray-800\/20/g, 'bg-gray-50'],
  [/bg-gray-800/g, 'bg-gray-100'],
  [/bg-gray-950\/60/g, 'bg-white'],
  [/bg-gray-950\/50/g, 'bg-white'],
  
  // Borders
  [/border-gray-800\/60/g, 'border-gray-200'],
  [/border-gray-800\/50/g, 'border-gray-200'],
  [/border-gray-800\/40/g, 'border-gray-200'],
  [/border-gray-800/g, 'border-gray-200'],
  [/border-gray-700\/60/g, 'border-gray-200'],
  [/border-gray-700\/50/g, 'border-gray-200'],
  [/border-gray-700\/40/g, 'border-gray-200'],
  
  // Purples -> Emeralds
  [/bg-purple-600/g, 'bg-emerald-600'],
  [/bg-purple-600\/30/g, 'bg-emerald-100'],
  [/text-purple-300/g, 'text-emerald-700'],
  [/text-purple-400/g, 'text-emerald-600'],
  [/border-purple-500\/50/g, 'border-emerald-300'],
  [/focus:border-purple-500\/60/g, 'focus:border-emerald-500'],
  [/border-purple-500\/60/g, 'border-emerald-500'],
  [/border-purple-500/g, 'border-emerald-500'],
  [/shadow-purple-500\/20/g, 'shadow-emerald-600\/20'],
  [/from-purple-600 to-indigo-600/g, 'from-emerald-600 to-teal-600'],
  [/hover:from-purple-500 hover:to-indigo-500/g, 'hover:from-emerald-500 hover:to-teal-500'],
  [/text-purple-500/g, 'text-emerald-600'],
  [/border-purple-500\/30/g, 'border-emerald-200'],
  [/border-t-purple-500/g, 'border-t-emerald-600'],
  
  // Hovers
  [/hover:text-white/g, 'hover:text-gray-900'],
  [/hover:bg-gray-800/g, 'hover:bg-gray-100'],
  [/hover:border-gray-700\/60/g, 'hover:border-gray-300'],
  
  // Placeholders
  [/placeholder-gray-600/g, 'placeholder-gray-400'],
  
  // Misc remaining dark elements
  [/bg-purple-500\/5/g, 'bg-emerald-50'],
  
  // Undo `text-gray-900` in badges/buttons where it should be white
  [/text-gray-900 transition shadow-lg/g, 'text-white transition shadow-lg'], // Analyse button text
  [/text-gray-900/g, (match, offset, string) => {
    // If it's a primary button, keep it white. Let's do a more targeted fix below.
    return 'text-gray-900';
  }]
];

for (const [regex, replacement] of replacements) {
  content = content.replace(regex, replacement);
}

// Targeted fixes for buttons that should still have white text
content = content.replace(/bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900/g, 'bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white');
content = content.replace(/disabled:opacity-40 disabled:cursor-not-allowed text-gray-900/g, 'disabled:opacity-40 disabled:cursor-not-allowed text-white');
content = content.replace(/bg-emerald-600 text-gray-900 shadow-lg/g, 'bg-emerald-600 text-white shadow-lg');
content = content.replace(/bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-100/g, 'bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-200');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Theme updated!');
