from playwright.sync_api import sync_playwright


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto("http://localhost:3000/demo_main")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(3000)
        page.screenshot(path="test-results/demo_main-full.png", full_page=True)
        print("Screenshot saved to test-results/demo_main-full.png")
        browser.close()


if __name__ == "__main__":
    main()
