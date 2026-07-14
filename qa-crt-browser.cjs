const { chromium } = require('playwright');

const viewports = [
  { name: '320x568', width: 320, height: 568 },
  { name: '375x812', width: 375, height: 812 },
  { name: '390x844', width: 390, height: 844 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1440x900', width: 1440, height: 900 },
];

async function waitForLoginButton(page) {
  const button = page.getByRole('button', { name: 'MASUK DENGAN GOOGLE' })
  await button.waitFor()
  await page.waitForFunction(() => {
    const element = document.querySelector('.crt-login-button')
    return element instanceof HTMLButtonElement && !element.disabled
  })
  return button
}

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true })
  const results = []
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } })
      const page = await context.newPage()
      await page.goto('http://localhost:3000/qa-crt/success')
      await page.evaluate(() => sessionStorage.removeItem('saleslab_boot_seen'))
      await page.reload()
      await waitForLoginButton(page)
      const metrics = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, scrollHeight: document.documentElement.scrollHeight, clientHeight: document.documentElement.clientHeight }))
      const buttonBox = await page.getByRole('button', { name: 'MASUK DENGAN GOOGLE' }).boundingBox()
      await page.screenshot({ path: `C:\\Users\\FAIZAL\\AppData\\Local\\Temp\\opencode\\crt-${viewport.name}.png`, fullPage: false })
      results.push({ case: `crt-${viewport.name}`, passed: metrics.scrollWidth === metrics.clientWidth && metrics.scrollHeight <= metrics.clientHeight && Boolean(buttonBox && buttonBox.height >= 44), ...metrics, buttonHeight: Math.round(buttonBox?.height || 0) })
      await context.close()
    }

    const context = await browser.newContext({ viewport: { width: 375, height: 812 } })
    const page = await context.newPage()
    await page.goto('http://localhost:3000/qa-crt/success')
    await page.evaluate(() => sessionStorage.setItem('saleslab_boot_seen', 'true'))
    await page.reload()
    const repeatedStart = Date.now()
    await waitForLoginButton(page)
    const repeatedMs = Date.now() - repeatedStart
    const appBefore = await page.locator('.app-entry-layer').count()
    await page.getByRole('button', { name: 'MASUK DENGAN GOOGLE' }).click()
    await page.locator('.crt-entering').waitFor()
    const enteringStart = Date.now()
    const appUnderOverlay = await page.locator('.app-entry-layer').count()
    await page.locator('.crt-login-overlay').waitFor({ state: 'detached' })
    const entryMs = Date.now() - enteringStart
    const appAfter = await page.getByRole('heading', { name: 'Desktop SalesLab' }).isVisible()
    results.push({ case: 'success-entry', passed: repeatedMs < 700 && appBefore === 0 && appUnderOverlay === 1 && appAfter && entryMs >= 650 && entryMs <= 1000, repeatedMs, appBefore, appUnderOverlay, appAfter, entryMs })

    await page.getByRole('button', { name: 'Keluar' }).click()
    await waitForLoginButton(page)
    const loginAgain = await page.locator('.crt-login-overlay').isVisible()
    results.push({ case: 'logout-login-again', passed: loginAgain, loginAgain })
    await context.close()

    const failureContext = await browser.newContext({ viewport: { width: 375, height: 812 } })
    const failurePage = await failureContext.newPage()
    await failurePage.goto('http://localhost:3000/qa-crt/failure')
    await failurePage.evaluate(() => sessionStorage.setItem('saleslab_boot_seen', 'true'))
    await failurePage.reload()
    await (await waitForLoginButton(failurePage)).click()
    await failurePage.getByRole('button', { name: 'MENGAUTENTIKASI...' }).waitFor()
    await waitForLoginButton(failurePage)
    const failureRecovered = await failurePage.getByRole('button', { name: 'MASUK DENGAN GOOGLE' }).isEnabled()
    results.push({ case: 'failed-cancelled', passed: failureRecovered, failureRecovered })
    await failureContext.close()

    const restoredContext = await browser.newContext({ viewport: { width: 375, height: 812 } })
    const restoredPage = await restoredContext.newPage()
    await restoredPage.goto('http://localhost:3000/qa-crt/restored')
    await restoredPage.locator('[data-entry-active="true"]').waitFor()
    const restoredStart = Date.now()
    await restoredPage.locator('.crt-login-overlay').waitFor({ state: 'detached' })
    const restoredMs = Date.now() - restoredStart
    results.push({ case: 'restored-session', passed: restoredMs >= 220 && restoredMs < 500 && await restoredPage.getByRole('heading', { name: 'Desktop SalesLab' }).isVisible(), restoredMs })
    await restoredContext.close()

    const reducedContext = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' })
    const reducedPage = await reducedContext.newPage()
    await reducedPage.goto('http://localhost:3000/qa-crt/success')
    await reducedPage.evaluate(() => sessionStorage.setItem('saleslab_boot_seen', 'true'))
    await reducedPage.reload()
    const reducedStart = Date.now()
    await (await waitForLoginButton(reducedPage)).click()
    await reducedPage.locator('.crt-login-overlay').waitFor({ state: 'detached' })
    const reducedMs = Date.now() - reducedStart
    results.push({ case: 'reduced-motion', passed: reducedMs < 500, reducedMs })
    await reducedContext.close()

    const profileContext = await browser.newContext({ viewport: { width: 375, height: 812 } })
    const profilePage = await profileContext.newPage()
    await profilePage.goto('http://localhost:3000/qa-crt/profile')
    await profilePage.evaluate(() => sessionStorage.setItem('saleslab_boot_seen', 'true'))
    await profilePage.reload()
    await (await waitForLoginButton(profilePage)).click()
    await profilePage.getByRole('heading', { name: 'Siapa Nama Anda?' }).waitFor()
    const profileOverlayRemoved = await profilePage.locator('.crt-login-overlay').count() === 0
    results.push({ case: 'profile-completion-order', passed: profileOverlayRemoved, profileOverlayRemoved })
    await profileContext.close()
  } finally {
    await browser.close()
  }

  console.table(results)
  if (results.some(result => !result.passed)) process.exitCode = 1
})().catch(error => {
  console.error(error)
  process.exitCode = 1
})
