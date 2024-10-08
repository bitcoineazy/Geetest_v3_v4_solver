## Geetest v3, v4 captcha solver (inject, interceptor, redefine solver)

![views](https://raw.githubusercontent.com/bitcoineazy/Geetest_v3_v4_solver/traffic/traffic-Geetest_v3_v4_solver/views.svg)
![views per week](https://raw.githubusercontent.com/bitcoineazy/Geetest_v3_v4_solver/traffic/traffic-Geetest_v3_v4_solver/views_per_week.svg)
![clones](https://raw.githubusercontent.com/bitcoineazy/Geetest_v3_v4_solver/traffic/traffic-Geetest_v3_v4_solver/clones.svg)
![clones per week](https://raw.githubusercontent.com/bitcoineazy/Geetest_v3_v4_solver/traffic/traffic-Geetest_v3_v4_solver/clones_per_week.svg)

### Mechanism
1. Script is injected via console into page
```js
const preloadFile = fs.readFileSync('./inject_captcha_solver.js', 'utf8');
await page.evaluate(preloadFile);
```
2. "initGeetest" & "initGeetest4" that invoke captcha redefined into custom solutions
3. "window.captchaObj" & "window.captchaObjV4" represent interceptor and page sends geetest v3, v4 config and callbacks into these objects for us to track, modify and validate
4. On captcha initialization script creates "captcha widget" on page with necessary paramaters to input into solver -  node js example:
   ```js
    // Extract the data-gt and data-challenge attributes from created widget on page
    const gtConfigData = await page.evaluate(() => {
        const captchaWidget = document.querySelector('captcha-widget');
        if (captchaWidget) {
        return {
            dataGt: captchaWidget.getAttribute('data-gt'),
            dataChallenge: captchaWidget.getAttribute('data-challenge'),
        };
        }
        return null;
    });

    if (gtConfigData) {
        console.log('captcha-widget data-gt:', gtConfigData.dataGt);
        console.log('captcha-widget data-challenge:', gtConfigData.dataChallenge);
    } else {
        console.log('captcha-widget not found');
    }   
   ```
5. Solve captcha via api, etc, ...
```js
// Example geetest solver
const TwoCaptcha = require("@2captcha/captcha-solver")
const solver = new TwoCaptcha.Solver("api-key")

const currentUrl = page.url()
const browserUserAgent = await browser.userAgent()

solverResult = await solver.geetest({
    pageurl: currentUrl,
    gt: gtConfigData.dataGt,
    challenge: gtConfigData.dataChallenge,
    userAgent: browserUserAgent,
    proxy: ,    // Add your proxy settings if needed
    proxytype:  // Add your proxy type if needed
    });
```   
6. On ready solution got from captcha solver services (2captcha, etc...), "window.captchaObjEvents" & "window.captchaObjEventsV4" invoke onSuccessCallback and "window.captchaObj" & "window.captchaObjV4" invoke onSuccess method that triggers page's validation callback and captcha proceed to validation like you solved it manually on page
```js
    // externally modify getValidate method
    await page.evaluate(
        (challenge, validate, seccode) => {
        if (typeof captchaObj !== 'undefined') {
            captchaObj.getValidate = function () {
            return {
                geetest_challenge: challenge,
                geetest_validate: validate,
                geetest_seccode: seccode,
            };
            };
        } else {
            console.error('captchaObj is not defined');
        }
        }, geetest_challenge, geetest_validate, geetest_seccode // values got from api solver, etc
        );
    
    console.log('captchaObj.getValidate function modified successfully');

    // validate successfully solved captcha by invoking onSuccessCallback of captchaObjEvents
    await page.evaluate(() => {
        if (typeof captchaObjEvents !== 'undefined' && typeof captchaObj !== 'undefined') {
            captchaObjEvents.onSuccessCallback(captchaObj);
            console.log('onSuccessCallback executed successfully');
        } else {
            onsole.error('captchaObjEvents or captchaObj is not defined');
        }
    });
    console.log('onSuccessCallback executed successfully');
```
   
### Notes
1. Captcha doesn't appear on screen - solving service (api, etc...) solve it remotely
2. If captcha appears on screen - challenge can't be solved remotely
3. Script creates "captcha-widget" element on page when captcha is initialized. That element contains necessary attributes to solve captcha - "gt, challenge"
4. Geetest v4 "initGeetest4" is bypassed through "old challenge callback" so page invokes Geetest v3 "initGeetest" instead 
`TODO: update to accept geetest v4 captcha, not bypass`
5. By using api solvers it is possible to send user-agent and current proxy - solver will use your credentials
