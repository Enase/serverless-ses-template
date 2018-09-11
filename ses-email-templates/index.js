const fs = require('fs');
const path = require('path');

const templateList = [
    {
        templateId: 'example',
        templateSubject: 'example',
    },
];

const sesEmailTemplates = templateList.map((templateInfo) => {
    const { templateId, templateSubject } = templateInfo;
    const templatePathHtml = path.join(__dirname, `templates/${templateId}.html`);
    const templatePathTxt = path.join(__dirname, `templates/${templateId}.txt`);

    return {
        name: templateId,
        subject: templateSubject,
        html: fs.readFileSync(templatePathHtml).toString('utf8'),
        text: fs.readFileSync(templatePathTxt).toString('utf8'),
    };
});

module.exports = sesEmailTemplates;
