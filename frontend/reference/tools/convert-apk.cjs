/* One-time extraction helper. src/web is the maintained application source. */
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'src/web');
const write = (name, value) => {
  const file = path.join(out, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
};
const groups = {
  marketplace: ['home','browse','detail','available','filtered','categoryChips','savedPage','qualityTag','card','sellerHome','modeSwitch','quickTile','listingCover','gallery','publicDescription'],
  onboarding: ['welcome','onboard'],
  requirements: ['requestCard','requestsPage','requestDetail','requestForm','offerForm'],
  listings: ['newDraft','captureDraft','sellPage','manageListings','persistDraft','draftCapture'],
  trades: ['dealCard','dealsPage','dealPage','makeDeal','activityPage','agreementForm','receiptForm','documentPage','successPage'],
  services: ['inspectionForm','inspectionResults','transportForm','servicesPage'],
  payments: ['paymentForm','paymentsPage'],
  messaging: ['inboxPage','chatPage','notificationsPage','openChat','sendMessage','notify','voiceModal'],
  account: ['accountPage','profilePage','plansPage'],
  support: ['supportPage','ticketForm','helpPage'],
  administration: ['adminPage','moderationPage'],
  verification: ['buyerApproved','cleanPhone','validPhone','verificationLabel','contactAllowed','verificationPage','buyerReview','openContact','contactMessage','launchContact','historyPage','contactSettings','privacyPage','sellerEnquiries'],
  guide: ['journeySteps','flowGuide'],
  media: ['openMediaDB','mediaStore','mediaLoad','mediaDelete','compressPhoto','validMedia','addMedia','hydrateMedia','mediaTile','mediaEditor','photoModal','samplePixels','timedMedia','scanFile','runMediaChecks'],
  insights: ['smartItem','smartKey','smartCanEdit','smartProfile','smartData','smartEstimate','smartSourceNote','pct','rateKind','reportCurrent','smartMini','smartEntry','smartCenter','profileForm','smartAnalysis','factsForm','priceReport','mediaReport','metricRows','qualityReport','fullReport','costModal','marketPage','dataPage','importPreviewForm','importFile','demoAI','reportDocument'],
};
const components = ['field','select','textarea','error','errorBox','header','nav','shell','empty','filterModal','modal','closeModal','toast'];
const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
const manifest = [];
for (const [file, layer] of [['app.js','base'], ['comfort.js','comfort'], ['smart.js','insights']]) {
  const source = ts.createSourceFile(file, fs.readFileSync(path.join(root,'reference/apk',file),'utf8'), ts.ScriptTarget.Latest, true);
  const buckets = new Map();
  const runtime = [];
  for (const node of source.statements) {
    if (node.getText(source) === 'render();') continue;
    let bucket = null;
    if (ts.isFunctionDeclaration(node)) {
      const name = node.name.text;
      const feature = Object.keys(groups).find(key => groups[key].includes(name));
      bucket = feature ? `features/${feature}/${layer}.js` : components.includes(name) ? `components/${layer}.js` : `core/${layer}-functions.js`;
    }
    const printed = printer.printNode(ts.EmitHint.Unspecified, node, source).replaceAll('art/', '/market/art/');
    if (bucket) {
      if (!buckets.has(bucket)) buckets.set(bucket, []);
      buckets.get(bucket).push(printed);
    } else runtime.push(printed);
  }
  for (const [name, statements] of buckets) {
    write(name, '// APK frontend: '+layer+' layer. Shared runtime bindings are composed by build-web.cjs.\n'+statements.join('\n\n')+'\n');
    manifest.push(name);
  }
  const name = `core/${layer}-runtime.js`;
  write(name, runtime.join('\n\n')+'\n');
  manifest.push(name);
}
for (const [source,target] of [['data.js','data/marketplace.js'],['smart-data.js','data/prices.js'],['smart-engine.js','lib/price-engine.js']]) {
  write(target, fs.readFileSync(path.join(root,'reference/apk',source),'utf8'));
}
write('manifest.json', JSON.stringify({ scripts: ['data/marketplace.js','data/prices.js','lib/price-engine.js',...manifest,'core/browser.js'], styles: ['styles/base.css','styles/comfort.css','styles/insights.css','styles/responsive.css'] },null,2)+'\n');
// Keep the APK styles readable and separate the insights layer from its base.
for (const [source,target] of [['app.css','base.css'],['comfort.css','comfort.css']]) {
  const css = fs.readFileSync(path.join(root,'reference/apk',source),'utf8');
  write('styles/'+target, css.replaceAll('}', '}\n'));
}
// Smart styles live in app.css/comfort.css in this APK build.
write('styles/insights.css', '/* Additional insights styles are defined in responsive.css. */\n');
console.log('Organized APK screens into', Object.keys(groups).length, 'feature folders.');
