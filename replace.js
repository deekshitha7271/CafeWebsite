const fs = require('fs');
const files = [
    'server/models/CafeSettings.js',
    'client/src/pages/admin/AdminLayout.jsx',
    'client/src/pages/customer/MenuPage.jsx',
    'client/src/pages/customer/LoginPage.jsx',
    'client/src/pages/customer/MenuItemDetailsPage.jsx',
    'client/src/components/customer/MenuItemCard.jsx',
    'client/src/components/customer/MenuListItem.jsx',
    'client/src/components/admin/InvoiceModal.jsx',
    'client/index.html'
];
files.forEach(file => {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        content = content.replace(/Ca Phe Bistro/g, 'Cá Phê Bistro');
        content = content.replace(/'Ca Phe'/g, "'Cá Phê'");
        content = content.replace(/>Ca Phe</g, ">Cá Phê<");
        content = content.replace(/CA PHE BISTRO/g, 'CÁ PHÊ BISTRO');
        content = content.replace(/CA PHE/g, 'CÁ PHÊ');
        fs.writeFileSync(file, content);
    }
});
console.log('Replacements completed.');
