const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walk(dirPath, callback) : callback(dirPath);
    });
}

walk('./app/api', (filePath) => {
    if (!filePath.endsWith('route.ts')) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Looking for console.error
    const regex = /console\.error\s*\(\s*["'`].*?["'`]\s*,\s*([a-zA-Z0-9_]+)\s*\);?/g;
    const regex2 = /console\.error\s*\(\s*([a-zA-Z0-9_]+)\s*\);?/g;
    
    if (regex.test(content) || regex2.test(content)) {
        const apiPath = filePath.replace(/\\/g, '/').replace('app/', '/').replace('/route.ts', '');
        
        // Use replace with function to avoid double replacement issues, but simpler:
        // Reset lastIndex because test() modifies it for global regexes
        regex.lastIndex = 0;
        regex2.lastIndex = 0;
        
        if (regex.test(content)) {
            regex.lastIndex = 0;
            content = content.replace(regex, `logError("${apiPath}", $1);`);
            changed = true;
        }
        
        if (regex2.test(content)) {
            regex2.lastIndex = 0;
            content = content.replace(regex2, (match, errName) => {
               if(errName === 'error' || errName === 'err' || errName === 'e') {
                   changed = true;
                   return `logError("${apiPath}", ${errName});`;
               }
               return match;
            });
        }
        
        if (changed) {
            // Add import
            if (!content.includes('import { logError }') && !content.includes('import { logActivity, logError }')) {
                if (content.includes('import { logActivity } from "@/lib/logger";')) {
                    content = content.replace('import { logActivity } from "@/lib/logger";', 'import { logActivity, logError } from "@/lib/logger";');
                } else {
                    content = `import { logError } from "@/lib/logger";\n` + content;
                }
            }
        }
    }

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log("Updated", filePath);
    }
});
