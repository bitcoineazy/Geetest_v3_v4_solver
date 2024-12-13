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
	const captchaWidget = document.querySelector("captcha-widget")
	if (captchaWidget) {
		return {
			dataGt: captchaWidget.getAttribute("data-gt"),
			dataChallenge: captchaWidget.getAttribute("data-challenge"),
		}
	}
	return null
})

if (gtConfigData) {
	console.log("captcha-widget data-gt:", gtConfigData.dataGt)
	console.log("captcha-widget data-challenge:", gtConfigData.dataChallenge)
} else {
	console.log("captcha-widget not found")
}
```
4.1 If you prefer to get config and solve captcha in puppeteer, selenium, playwright, ...
```js
// Example how to extract geetest4/geetest3 configs to solve via puppeteer
await page.waitForFunction(
    () => {
        return window.captchaObjv4 || window.captchaObj
    },
    { timeout: 30000 }
)
const captchaData = await page.evaluate(() => {
    const captchaObj = window.captchaObjv4 || window.captchaObj
    return captchaObj.getData()
})
// Then solve it with your captcha solver provider
```
5. Solve captcha via api, etc, ...
```js

const TwoCaptcha = require("@2captcha/captcha-solver")
const solver = new TwoCaptcha.Solver("api-key")

const currentUrl = page.url()
const browserUserAgent = await browser.userAgent()

// Example geetest3 solver
solverResult = await solver.geetest({
    pageurl: currentUrl,
    gt: gtConfigData.dataGt,
    challenge: gtConfigData.dataChallenge,
    userAgent: browserUserAgent,
    proxy: ,    // Add your proxy settings if needed
    proxytype:  // Add your proxy type if needed
})
// geetest4 solver
solverResult = await solver.geetest({
    pageurl: currentUrl,
    captcha_id: captchaId,
    userAgent: browserUserAgent,
    proxy: ,    // Add your proxy settings if needed
    proxytype:  // Add your proxy type if needed
})
```   
6. On ready solution got from captcha solver services (2captcha, etc...), "window.captchaObjEvents" & "window.captchaObjEventsV4" invoke onSuccessCallback and "window.captchaObj" & "window.captchaObjV4" invoke onSuccess method that triggers page's validation callback and captcha proceed to validation like you solved it manually on page
```js
// externally modify getValidate method
// if geetest v3
await page.evaluate(
	(challenge, validate, seccode) => {
		if (typeof captchaObj !== "undefined") {
			captchaObj.getValidate = function () {
				return {
					geetest_challenge: challenge,
					geetest_validate: validate,
					geetest_seccode: seccode,
				}
			}
		} else {
			console.error("captchaObj is not defined")
		}
	},
	geetest_challenge,
	geetest_validate,
	geetest_seccode // values got from api solver, etc
)
// or if geetest v4
await page.evaluate(
    (captcha_id, lot_number, pass_token, gen_time, captcha_output) => {
        if (typeof captchaObjv4 !== "undefined") {
            captchaObjv4.getValidate = function () {
                return {
                    captcha_id: captcha_id,
                    lot_number: lot_number,
                    pass_token: pass_token,
                    gen_time: gen_time,
                    captcha_output: captcha_output,
                }
            }
        } else {
            // console.error("captchaObjv4 is not defined")
        }
    },
    solverResult.data.captcha_id,
    solverResult.data.lot_number,
    solverResult.data.pass_token,
    solverResult.data.gen_time,
    solverResult.data.captcha_output
)

console.log("captchaObj.getValidate function modified successfully")

// validate successfully solved captcha by invoking onSuccessCallback of captchaObjEvents/captchaObjEventsv4
await page.evaluate(() => {
	if (typeof captchaObjEvents !== "undefined" && typeof captchaObj !== "undefined") {
		// onSuccessCallback then will tell page to use our solved parameters in redefined getValidate
	    captchaObjEvents.onSuccessCallback(captchaObj)
		console.log("onSuccessCallback executed successfully")
	} else {
		onsole.error("captchaObjEvents or captchaObj is not defined")
	}
})
console.log("onSuccessCallback executed successfully")
// Captcha solved and page accepted it!
```
   
### Notes
1. Captcha doesn't appear on screen - solving service (api, etc...) solve it remotely
2. If captcha appears on screen - challenge can't be solved remotely
3. Script can create getData() methods in both geetest3, geetest4 for reading and solving in puppeteer, ... or can create "captcha-widget" element on page when captcha is initialized that contains necessary attributes to read and solve captcha
4. Geetest v3, v4 solving working
5. By using api solvers it is possible to send user-agent and current proxy - solver will use your credentials
