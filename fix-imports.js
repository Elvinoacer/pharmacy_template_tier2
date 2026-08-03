const fs = require('fs');
const files = [
  'app/admin/feedback/page.tsx',
  'app/admin/messages/page.tsx',
  'app/components/admin/AdminNotificationsPanel.tsx',
  'app/portal/page.tsx',
  'app/portal/refills/page.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let timeImportStr = 'import { formatDate } from "@/app/lib/time";\n';
  if (content.includes('import { formatDateTime } from "@/app/lib/time";')) {
     timeImportStr = 'import { formatDateTime } from "@/app/lib/time";\n';
  } else if (content.includes('import { formatDateTime, formatDate } from "@/app/lib/time";')) {
     timeImportStr = 'import { formatDateTime, formatDate } from "@/app/lib/time";\n';
  }

  // Remove all matching ones
  content = content.replace('import { formatDate } from "@/app/lib/time";\n', '');
  content = content.replace('import { formatDateTime } from "@/app/lib/time";\n', '');
  content = content.replace('import { formatDateTime, formatDate } from "@/app/lib/time";\n', '');

  // Add it to the very top (after any "use client" if present)
  if (content.startsWith('"use client";')) {
    content = content.replace('"use client";\n', '"use client";\n' + timeImportStr);
  } else {
    content = timeImportStr + content;
  }
  fs.writeFileSync(file, content);
  console.log('Fixed', file);
}
