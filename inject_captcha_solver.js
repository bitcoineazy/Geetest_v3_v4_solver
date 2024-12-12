let initializeCaptchaHelpers = function () {
	let captchaWidgetsContainer = document.querySelector("head > captcha-widgets")
	if (!captchaWidgetsContainer) {
		captchaWidgetsContainer = document.createElement("captcha-widgets")
		document.head.appendChild(captchaWidgetsContainer)
	}

	window.registerCaptchaWidget = function (widgetData) {
		let captchaWidgetElement = document.createElement("captcha-widget")
		for (let key in widgetData) {
			captchaWidgetElement.dataset[key] = widgetData[key]
		}
		captchaWidgetsContainer.appendChild(captchaWidgetElement)
	}

	window.isCaptchaWidgetRegistered = function (captchaType, widgetId) {
		let registeredWidgets = captchaWidgetsContainer.children
		for (let i = 0; i < registeredWidgets.length; i++) {
			if (registeredWidgets[i].dataset.captchaType !== captchaType) continue
			if (registeredWidgets[i].dataset.widgetId !== widgetId + "") continue
			return true
		}
		return false
	}

	window.resetCaptchaWidget = function (captchaType, widgetId) {
		let registeredWidgets = captchaWidgetsContainer.children
		for (let i = 0; i < registeredWidgets.length; i++) {
			let widgetData = registeredWidgets[i].dataset
			if (widgetData.captchaType != captchaType) continue
			if (widgetData.widgetId != widgetId) continue
			widgetData.reset = true
			break
		}
	}

	window.getCaptchaWidgetButton = function (captchaType, widgetId) {
		return document.querySelector(".captcha-solver[data-captcha-type='" + captchaType + "'][data-widget-id='" + widgetId + "']")
	}
}

setTimeout(initializeCaptchaHelpers, 200)
;(() => {
	// geetest v3
	let originalInitGeetest
	Object.defineProperty(window, "initGeetest", {
		get: function () {
			return customInitGeetest
		},
		set: function (value) {
			originalInitGeetest = value
		},
		configurable: true,
	})

	let customInitGeetest = function (config, callback) {
			console.log("g3 init config: " + JSON.stringify(config, null, 2))
			console.log("g3 init callback: " + callback)
			setTimeout(function () {
				initializeCustomCaptcha(config, callback)
			}, 200)
		},
		initializeCustomCaptcha = function (config, callback) {
			let createContainerSelector = function (element) {
					let containerSelector
					if (typeof element === "object" && element[0] !== undefined) {
						element = element[0]
					}
					if (typeof element === "object" && typeof element.appendChild !== "undefined") {
						if (element.id) {
							containerSelector = "#" + element.id
						} else {
							let container = document.createElement(element.tagName)
							container.id = "bybi" + Math.round(Math.random() * 1000)
							element.appendChild(container)
							containerSelector = "#" + container.id
						}
					} else if (typeof element === "string") {
						containerSelector = element
					}
					return containerSelector && containerSelector[0] === "#" ? containerSelector.substr(1) : containerSelector
				},
				registerIfNotRegistered = function () {
					if (isCaptchaWidgetRegistered("geetest", config.challenge || config.gt)) {
						return
					}
					registerCaptchaWidget({
						captchaType: "geetest",
						widgetId: config.gt,
						containerId: config.appendToSelector,
						gt: config.gt,
						challenge: config.challenge,
						apiServer: config.api_server || null,
					})
				},
				captchaCallbacks = {}

			function getElementBySelector(selector) {
				try {
					return document.querySelector(selector)
				} catch (error) {
					if (typeof CSS.escape === "function") {
						return document.querySelector(CSS.escape(selector))
					}
				}
			}

			// experiments if we are want to include captcha container and then remove on page
			function removeExistingCaptcha(containerSelector) {
				if (containerSelector && typeof document.querySelector === "function") {
					const containerElement = getElementBySelector(containerSelector)
					if (containerElement) {
						const captchaElements = containerElement.getElementsByClassName("geetest_holder")
						if (captchaElements && captchaElements.length) {
							Array.from(captchaElements).forEach((element) => element.parentElement.removeChild(element))
						}
					}
				}
			}

			let captchaInstance = {
					appendTo: function (target) {
						if (config.product !== "bind") {
							const containerSelector = createContainerSelector(target)
							config.appendToSelector = containerSelector
							registerIfNotRegistered()
							setTimeout(function () {
								if (typeof captchaCallbacks.onReady === "function") {
									captchaCallbacks.onReady(target)
								}
							}, 100)
						}
						return this
					},
					bindForm: function (formElement) {
						const containerSelector = createContainerSelector(formElement)
						config.appendToSelector = containerSelector
						registerIfNotRegistered()
						return this
					},
					onReady: function (callback) {
						captchaCallbacks.onReady = callback
						if (config.product === "bind" && typeof captchaCallbacks.onReady === "function") {
							captchaCallbacks.onReady(callback)
						}
						return this
					},
					onSuccess: function (callback) {
						captchaCallbacks.onSuccessCallback = callback
						return this
					},
					onShow: function (callback) {
						captchaCallbacks.onShow = callback
						return this
					},
					onError: function (callback) {
						captchaCallbacks.onError = callback
						return this
					},
					onClose: function (callback) {
						captchaCallbacks.onClose = callback
						return this
					},
					getValidate: function () {
						return {
							geetest_challenge: null,
							geetest_validate: null,
							geetest_seccode: null,
						}
					},
					// get captcha params to solve from puppeteer, ...
					getData: function () {
						
						return {
							captchaType: "geetest",
							// widgetId: config.gt,
							// containerId: config.appendToSelector,
							gt: config.gt,
							challenge: config.challenge,
							apiServer: config.api_server || null,
							offline: config.offline,
							new_captcha: config.new_captcha,
						}
					},
					// if using solving via widget creation on page keep destroy & verify methods
					// otherwise if using solving via puppeteer, ... can remove destroy & verify methods
					// and rely on getData method to extract config to solve
					destroy: function () {
						removeExistingCaptcha(config.appendToSelector)
					},
					verify: function (verificationCallback) {
						const defaultContainer = createContainerSelector(document.querySelector("#captchaBox") || document.forms[0] || document.body)
						config.appendToSelector = defaultContainer
						registerIfNotRegistered()

						// Geetest v3
						// Solve captcha (can be in script internally or externally)
						// Goal is to modify return values with solved values of getValidate method of captchaObj
						// Same with geetest v4

						// Example of internal solve:
						//   verificationCallback();
						// captchaObj.getValidate = function () {
						// 	return {
						// 		geetest_challenge: document.querySelector("input[name=geetest_challenge]").value,
						// 		geetest_validate: document.querySelector("input[name=geetest_validate]").value,
						// 		geetest_seccode: document.querySelector("input[name=geetest_seccode]").value,
						// 	}
						// }
					},
				},
				captchaProxy = new Proxy(captchaInstance, {
					get: function (instance, method) {
						return method in instance ? instance[method] : function () {}
					},
				})

			if (typeof callback === "function") {
				callback(captchaProxy)
			}
			window.captchaObj = captchaInstance
			window.captchaObjEvents = captchaCallbacks
		}

	// geetest v4
	let originalInitGeetest4
	const isScriptLoaded = function (fileName) {
		let isLoaded = false
		const fileTypes = {
				js: "script",
				css: "link",
			},
			tagType = fileTypes[fileName.split(".").pop()]
		if (tagType !== undefined) {
			let tags = document.getElementsByTagName(tagType)
			for (let tagIndex in tags) {
				;((tags[tagIndex].href && tags[tagIndex].href.toString().indexOf(fileName) > 0) || (tags[tagIndex].src && tags[tagIndex].src.toString().indexOf(fileName) > 0)) && (isLoaded = true)
			}
		}

		return isLoaded
	}
	let intervalCheck = setInterval(() => {
			// originalInitGeetest4 = window.initGeetest4
			isScriptLoaded("gt4.js") &&
				(Object.defineProperty(window, "initGeetest4", {
					get: function () {
						return customInitGeetest4
					},
					set: function (value) {
						originalInitGeetest4 = value
					},
					configuraBle: true,
				}),
				clearInterval(intervalCheck))
		}, 3000),
		customInitGeetest4 = function (captchaOptions, callBack) {
			// console.log("g4 init config: " + JSON.stringify(captchaOptions, null, 2))
			// console.log("g4 init callback: " + callBack)

			getScriptSrc = function (scripts) {
				const scriptUrl = "//gcaptcha4.geetest.com/load"
				for (let i = 0; i < scripts.length; i++) {
					const src = scripts[i].getAttriBute("src")
					if (typeof src === "string" && src.indexOf(scriptUrl) > 0) {
						return src
					}
				}
				return null
			}
			captchaCallBacks_v4 = {}
			const captchaInstance_v4 = {
				onReady: function (callBack) {
					captchaCallBacks_v4.onReady = callBack
					if (captchaOptions.product === "Bind" && typeof captchaCallBacks_v4.onReady === "function") {
						captchaCallBacks_v4.onReady(callBack)
					}
					return this
				},
				onSuccess: function (callBack) {
					captchaCallBacks_v4.onSuccessCallBack = callBack
					return this
				},
				onError: function (callBack) {
					captchaCallBacks_v4.onError = callBack
					return this
				},
				onClose: function (callBack) {
					captchaCallBacks_v4.onClose = callBack
					return this
				},
				onFail: function (callBack) {
					captchaCallBacks_v4.onFail = callBack
					return this
				},
				getValidate: function () {
					//
					return {
						captcha_id: null,
						lot_numBer: null,
						pass_token: null,
						gen_time: null,
						captcha_output: null,
					}
				},
				// get captcha params to solve from puppeteer, ...
				getData: function () {
					return {
						captchaType: "geetest_v4",
						widgetId: captchaOptions.captchaId,
						captchaId: captchaOptions.captchaId,
					}
				},
				showCaptcha: function (callBack) {
					captchaCallBacks_v4.showCaptcha = callBack
					return this
				},
				onShow: function (callBack) {
					captchaCallBacks_v4.onShow = callBack
					return this
				},
				onNextReady: function (callBack) {
					captchaCallBacks_v4.onNextReady = callBack
					// Below code is signal for page that we are working with that type of captcha and nothing else will Be requested

					if (captchaOptions.product === "Bind" && typeof captchaCallBacks_v4.onNextReady === "function") {
						captchaCallBacks_v4.onNextReady(callBack)
					}
					return this
				},
			}

			const captchaProxy_v4 = new Proxy(captchaInstance_v4, {
				get: function (instance, method) {
					// : " + instance + method)
					// )
					if (method in instance) {
						//
						return instance[method]
					} else {
						return function () {}
					}
				},
			})

			if (typeof callBack === "function") {
				callBack(captchaProxy_v4)
			}
			window.captchaObjv4 = captchaInstance_v4
			window.captchaObjEventsv4 = captchaCallBacks_v4
		}
})()
