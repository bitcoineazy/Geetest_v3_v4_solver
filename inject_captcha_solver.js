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
		return document.querySelector(
			".captcha-solver[data-captcha-type='" + captchaType + "'][data-widget-id='" + widgetId + "']"
		)
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
					return containerSelector && containerSelector[0] === "#"
						? containerSelector.substr(1)
						: containerSelector
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
					destroy: function () {
						removeExistingCaptcha(config.appendToSelector)
					},
					verify: function (verificationCallback) {
						const defaultContainer = createContainerSelector(
							document.querySelector("#captchaBox") || document.forms[0] || document.body
						)
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
				;((tags[tagIndex].href && tags[tagIndex].href.toString().indexOf(fileName) > 0) ||
					(tags[tagIndex].src && tags[tagIndex].src.toString().indexOf(fileName) > 0)) &&
					(isLoaded = true)
			}
		}
		console.log(isLoaded)
		return isLoaded
	}
	let intervalCheck = setInterval(() => {
			originalInitGeetest4 = window.initGeetest4
			isScriptLoaded("gt4.js") &&
				(Object.defineProperty(window, "initGeetest4", {
					get: function () {
						return customInitGeetest4
					},
					set: function (value) {
						originalInitGeetest4 = value
					},
					configurable: true,
				}),
				clearInterval(intervalCheck))
			console.log("Interval has been cleared")
		}, 1),
		customInitGeetest4 = function (captchaOptions, callback) {
			console.log("g4 init captchaOptions: " + JSON.stringify(captchaOptions, null, 2))
			console.log("g4 init callback: " + callback)
			const getCaptchaId = function () {
					if (captchaOptions && captchaOptions.captchaId) {
						return captchaOptions.captchaId
					}
					const scripts = document.querySelectorAll("script")
					console.log("getting scripts")
					let scriptSrc = getScriptSrc(scripts)
					const url = new URL(scriptSrc)
					console.log("captcha_id:" + url.searchParams.get("captcha_id"))
					return url.searchParams.get("captcha_id")
				},
				registerCaptcha = function () {
					const captchaId = getCaptchaId()
					if (isCaptchaWidgetRegistered("geetest_v4", captchaId)) {
						return
					}
					registerCaptchaWidget({
						captchaType: "geetest_v4",
						widgetId: captchaId,
						captchaId: captchaId,
					})
				},
				getScriptSrc = function (scripts) {
					const scriptUrl = "//gcaptcha4.geetest.com/load"
					for (let i = 0; i < scripts.length; i++) {
						const src = scripts[i].getAttribute("src")
						if (typeof src === "string" && src.indexOf(scriptUrl) > 0) {
							return src
						}
					}
					return null
				},
                // get solved values internally
				getCaptchaValues = function () {
					return {
						captcha_id: document.querySelector("input[name=captcha_id]").value,
						lot_number: document.querySelector("input[name=lot_number]").value,
						pass_token: document.querySelector("input[name=pass_token]").value,
						gen_time: document.querySelector("input[name=gen_time]").value,
						captcha_output: document.querySelector("input[name=captcha_output]").value,
					}
				}
			let captchaEvents = {
				onSuccess: onSuccessHandler,
				onError: onErrorHandler,
				onClose: onCloseHandler,
			}
			originalInitGeetest4(captchaOptions, (geetestInstance) => {
				let proxyInstance = new Proxy(geetestInstance, {
					get: function (target, property) {
						switch (property) {
							case "onReady":
							case "appendTo":
								registerCaptcha()
								return target[property]
							case "getValidate":
								const captchaId = document.querySelector("input[name=captcha_id]").value
								if (captchaId) {
									return getCaptchaValues
								}
								return target[property]
							case "onSuccess":
								return function (onSuccessHandler) {}
							case "onError":
								return function (onErrorHandler) {}
							case "onClose":
								return function (onCloseHandler) {}
							default:
								return target[property]
						}
					},
				})
				window.captchaObjV4 = proxyInstance
				window.captchaObjEventsV4 = captchaEvents
				callback(proxyInstance)
			})
		}
})()
