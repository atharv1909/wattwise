/**
 * WattWise Multilingual AI Copilot Service
 * Languages: English, Hindi (हिंदी), Marathi (मराठी)
 * 
 * CORE PRINCIPLE: The AI never performs arithmetic.
 * Natural Language Query -> Validated Structured Intent (JSON) -> Deterministic Engine -> Natural Language Narration
 */

const { calculateBill, getSlabGauge } = require('./billEngine');
const { runWhatIfScenario } = require('./whatif');

/**
 * Supported Languages
 */
const SUPPORTED_LANGUAGES = ['en', 'hi', 'mr'];

/**
 * Intelligent Rule-Based Local Intent Parser (Offline Fallback & Demo Safe)
 * Extracts structured intent from natural text in English, Hindi, or Marathi
 */
function parseUserIntent(queryText) {
  const query = (queryText || '').toLowerCase().trim();

  // 1. What-If: AC Star Upgrade
  const wantsAcUpgrade = query.includes('5 star') || query.includes('5-star') || 
                         query.includes('five star') || query.includes('inverter ac') ||
                         query.includes('५ स्टार') || query.includes('५-स्टार');

  // 2. What-If: Reduce AC Hours
  let cutHours = 0;
  const hourMatch = query.match(/(\d+)\s*(hour|hours|hr|hrs|घंटे|तास)/i);
  if (hourMatch && (query.includes('cut') || query.includes('reduce') || query.includes('kam') || query.includes('कमी') || query.includes('घटा'))) {
    cutHours = parseInt(hourMatch[1], 10);
  }

  // 3. What-If: BLDC Fan Upgrade
  const wantsBldcFan = query.includes('bldc') || query.includes('fan upgrade') || 
                       query.includes('पंखा') || query.includes('पंख्या');

  // 4. What-If: Solar
  let solarKw = 0;
  const solarMatch = query.match(/(\d+)\s*(kw|kwp|किलोवॉट|किलोवाट)/i);
  if (query.includes('solar') || query.includes('सौर') || query.includes('सोलर')) {
    solarKw = solarMatch ? parseInt(solarMatch[1], 10) : 2;
  }

  // 5. Query type: Slab Inquiry
  const isSlabInquiry = query.includes('slab') || query.includes('100 units') || query.includes('स्लॅब') || 
                        query.includes('स्लैब') || query.includes('unit rate') || query.includes('दर');

  // 6. Query type: Bill Explanation
  const isBillExplanation = query.includes('explain') || query.includes('breakdown') || query.includes('why') ||
                            query.includes('क्यों') || query.includes('का') || query.includes('कारण');

  if (wantsAcUpgrade || cutHours > 0 || wantsBldcFan || solarKw > 0) {
    return {
      type: 'whatif',
      scenario: {
        upgradeAcTo5Star: wantsAcUpgrade,
        reduceAcHoursBy: cutHours,
        upgradeFansToBldc: wantsBldcFan,
        solarKw: solarKw
      }
    };
  } else if (isSlabInquiry) {
    return { type: 'explain_slab' };
  } else if (isBillExplanation) {
    return { type: 'explain_bill' };
  } else {
    return { type: 'general_advice' };
  }
}

/**
 * Generate Multilingual Narration from Verified Engine Results
 */
function narrateResponse(intentResult, lang = 'en') {
  const language = SUPPORTED_LANGUAGES.includes(lang) ? lang : 'en';

  if (intentResult.type === 'whatif') {
    const s = intentResult.savings;
    const b = intentResult.baseline;
    const sc = intentResult.scenario;

    if (language === 'mr') {
      return {
        reply: `तुमच्या या बदलामुळे दरमहा अंदाजे **₹${s.monthlyRupeesSaved}** (वार्षिक **₹${s.annualRupeesSaved}**) ची थेट बचत होईल!\n\n` +
               `• **मूळ वापर:** ${b.units} युनिट्स (बिल: ₹${b.billAmount})\n` +
               `• **बदलानंतर वापर:** ${sc.netUnits} युनिट्स (बिल: ₹${sc.billAmount})\n` +
               `• **एकूण बचत:** ${s.percentSaved}% कमी खर्च\n` +
               (s.droppedSlab ? `• **विशेष फायदा:** तुमचा वीज वापर उच्च स्लॅबमधून कमी स्लॅबमध्ये आला आहे, ज्यामुळे जास्त दर टळला!` : '') +
               `\n\n💡 *महावितरण (MSEDCL) LT-I नियमांनुसार अचूक गणना केली आहे.*`,
        metrics: s
      };
    } else if (language === 'hi') {
      return {
        reply: `इस बदलाव से आपके बिजली बिल में हर महीने लगभग **₹${s.monthlyRupeesSaved}** (सालाना **₹${s.annualRupeesSaved}**) की सीधी बचत होगी!\n\n` +
               `• **मौजूदा खपत:** ${b.units} यूनिट (बिल: ₹${b.billAmount})\n` +
               `• **बदलाव के बाद:** ${sc.netUnits} यूनिट (बिल: ₹${sc.billAmount})\n` +
               `• **कुल बचत:** ${s.percentSaved}% बिल कम हुआ\n` +
               (s.droppedSlab ? `• **अतिरिक्त लाभ:** आप महंगे बिजली स्लैब से नीचे आ गए हैं!` : '') +
               `\n\n💡 *यह गणना महाराष्ट्र विद्युत नियामक आयोग (MERC) के आधिकारिक टैरिफ पर आधारित है।*`,
        metrics: s
      };
    } else {
      return {
        reply: `Applying this change will save you approximately **₹${s.monthlyRupeesSaved}/month** (that's **₹${s.annualRupeesSaved} per year** in total savings)!\n\n` +
               `• **Current Usage:** ${b.units} kWh (Bill: ₹${b.billAmount})\n` +
               `• **Optimized Usage:** ${sc.netUnits} kWh (Bill: ₹${sc.billAmount})\n` +
               `• **Percentage Reduction:** ${s.percentSaved}%\n` +
               (s.droppedSlab ? `• **Slab Bonus:** You successfully dropped into a lower tariff bracket, avoiding steep marginal charges!` : '') +
               `\n\n💡 *Calculated deterministically using official MSEDCL LT-I tariff rules.*`,
        metrics: s
      };
    }
  }

  if (intentResult.type === 'explain_slab') {
    const gauge = intentResult.gauge;
    if (language === 'mr') {
      return {
        reply: `महावितरणच्या (MSEDCL LT-I) स्लॅब प्रणालीची रचना:\n\n` +
               `1. **० ते १०० युनिट्स:** ₹४.४१ प्रति युनिट\n` +
               `2. **१०१ ते ३०० युनिट्स:** ₹९.६४ प्रति युनिट (२.१८ पट महाग!)\n` +
               `3. **३०१ ते ५०० युनिट्स:** ₹१३.६१ प्रति युनिट\n` +
               `4. **५०० युनिट्सच्या वर:** ₹१५.७२ प्रति युनिट\n\n` +
               `⚠️ **महत्त्वाची टीप:** तुम्ही १०० युनिट्स ओलांडताच प्रत्येक पुढील युनिटसाठी दुप्पट दर लागतो. म्हणूनच १०० च्या आत राहण्याचा प्रयत्न केल्यास मोठा फायदा होतो.`,
        metrics: gauge
      };
    } else if (language === 'hi') {
      return {
        reply: `महाराष्ट्र (MSEDCL) बिजली स्लैब की संरचना:\n\n` +
               `1. **0 से 100 यूनिट:** ₹4.41 प्रति यूनिट\n` +
               `2. **101 से 300 यूनिट:** ₹9.64 प्रति यूनिट (2.18 गुना महंगा!)\n` +
               `3. **301 से 500 यूनिट:** ₹13.61 प्रति यूनिट\n` +
               `4. **500 से अधिक यूनिट:** ₹15.72 प्रति यूनिट\n\n` +
               `⚠️ **चेतावनी:** जैसे ही आप 100 यूनिट पार करते हैं, अगले यूनिट्स पर दर दोगुनी से भी अधिक हो जाती है।`,
        metrics: gauge
      };
    } else {
      return {
        reply: `Understanding Maharashtra (MSEDCL LT-I) Slabs:\n\n` +
               `1. **Tier 1 (0-100 units):** ₹4.41/kWh (Subsidized lifeline tier)\n` +
               `2. **Tier 2 (101-300 units):** ₹9.64/kWh (2.18x jump in marginal energy charge!)\n` +
               `3. **Tier 3 (301-500 units):** ₹13.61/kWh\n` +
               `4. **Tier 4 (>500 units):** ₹15.72/kWh\n\n` +
               `⚠️ Plus 16% Maharashtra Electricity Duty + ₹1.28/kWh Wheeling Charge + ₹0.35/kWh FAC on all units. Keeping usage strictly below 100 or 300 units delivers maximum rupee savings.`,
        metrics: gauge
      };
    }
  }

  // Default response
  if (language === 'mr') {
    return {
      reply: `मी तुमचा WattWise वीज बिल सहाय्यक आहे. तुम्ही मला असे प्रश्न विचारू शकता:\n` +
             `• "मी एसी ५ स्टार केला तर किती बिल वाचेल?"\n` +
             `• "दररोज एसी २ तास कमी चालवला तर काय बचत होईल?"\n` +
             `• "महावितरणचे स्लॅब दर कसे आहेत?"`
    };
  } else if (language === 'hi') {
    return {
      reply: `मैं आपका WattWise बिजली बिल सहायक हूँ। आप मुझसे पूछ सकते हैं:\n` +
             `• "यदि मैं AC 2 घंटे कम चलाऊं और 5-स्टार ले लूं तो क्या बचत होगी?"\n` +
             `• "100 यूनिट पार करने पर बिल कितना बढ़ेगा?"\n` +
             `• "मेरे बिल का ब्रेकडाउन समझाओ।"`
    };
  } else {
    return {
      reply: `I am your WattWise Electricity Copilot. Ask me questions like:\n` +
             `• "What if I cut AC by 2 hours and buy a 5-star AC?"\n` +
             `• "How much will I save if I replace ceiling fans with 5-star BLDC?"\n` +
             `• "Explain the MSEDCL slab jump from 100 to 300 units."`
    };
  }
}

/**
 * Handle Copilot Message
 * @param {string} userMessage - Natural language question
 * @param {Array} appliances - Household appliances list
 * @param {string} [lang='en'] - 'en', 'hi', or 'mr'
 * @param {Object} [householdData] - Additional household context
 * @returns {Object} Multilingual response with verified metrics
 */
async function handleCopilotQuery(userMessage, appliances = [], lang = 'en', householdData = {}) {
  const intent = parseUserIntent(userMessage);

  if (intent.type === 'whatif') {
    const whatifResult = runWhatIfScenario(appliances, intent.scenario);
    return narrateResponse({ type: 'whatif', ...whatifResult }, lang);
  } else if (intent.type === 'explain_slab') {
    const gauge = getSlabGauge(householdData.currentUnits || 120);
    return narrateResponse({ type: 'explain_slab', gauge }, lang);
  } else {
    return narrateResponse({ type: 'general_advice' }, lang);
  }
}

module.exports = {
  handleCopilotQuery,
  parseUserIntent,
  SUPPORTED_LANGUAGES
};
