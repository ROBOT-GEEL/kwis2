/**
 * Class to handle the language data.
 *
 * This class handles the following functionality:
 * - Loading the language data from the server
 * - Getting the text for a specific language key
 * - Adding a callback function to be called when the language changes
 * - Changing the selected language
 */
class LanguageData {
    static DEFAULT_LANGUAGE = 'NL';
    static #data = {};
    static selectedLanguage = this.DEFAULT_LANGUAGE;
    static #languageChangeCallbacks = []; // Array of functions to call when the language changes

    static {
        // Add the selected-language class to the default language
        document.querySelector(`#${this.selectedLanguage}-selector`).classList.add('selected-language');

        // Add event listeners to the language selectors
        document.querySelectorAll('.language-selector').forEach(el => {
            el.addEventListener('click', e => {
                console.log(e.target.dataset.language);
                // If the clicked selector is already selected, do nothing
                if (e.target.dataset.language === this.selectedLanguage) {
                    e.preventDefault();
                    return;
                }
                document.querySelector(`#${this.selectedLanguage}-selector`).classList.remove('selected-language');
                this.selectedLanguage = e.target.dataset.language;
                el.classList.add('selected-language');
                // Call the functions that are listening for a language change
                this.#languageChangeCallbacks.forEach(f => f());
            });
        });
    }

    /**
     * Update the language data from the server.
     */
    static async update() {
        const response = await fetch('/language');
        const data = await response.json();
        this.#data = data;
    }

    /**
     * Get the text for a specific language key.
     *
     * @param {string} key The language key to get the text for
     */
    static get(key) {
        return this.#data[key][this.selectedLanguage];
    }

    /**
     * Add a callback function to be called when the language changes.
     *
     * @param {Function} f The function to call when the language changes
     */
    static addLanguageChangeCallback(f) {
        this.#languageChangeCallbacks.push(f);
    }
}
