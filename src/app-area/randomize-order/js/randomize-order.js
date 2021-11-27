/* #region Variables */
const Constants = {
    colors: [
        "#000000",  // black
        "#c62828",  // red darken-3
        "#039be5",  // light-blue darken-1
        "#2e7d32",  // green darken-3
        "#f9a825",  // yellow darken-3
        "#7e57c2",  // deep-purple lighten-1
    ]
}

let items = [
    { value: "", color: null },
    { value: "", color: null },
    { value: "", color: null },
]

let reloadCount = 0
/* #endregion */

/* #region Initial Load */
$(document).ready(function () {
    shuffleArray(Constants.colors)
    reloadEditView()
})
/* #endregion */

/* #region Action Handlers */
$('#randomize-order-button-add').click(() => {
    let newIndex = items.length
    let newItem = { index: newIndex, value: "", color: colorForItem(newIndex) }
    let newElement = InputItem(newItem)
    $('#randomize-order-input-list-items').append(newElement)
    makeLabelsDontOverlap()
    items.push(newItem)
})

function removeItem(index) {
    let foundIndex = items.findIndex(element => element.index == index)
    if (foundIndex == -1) { return }

    saveItemValues()
    items.splice(foundIndex, 1)
    reloadEditView()
}

$('#randomize-order-button-randomize').click(() => {
    saveItemValues()
    let validItems = items.filter(item => item.value != null && item.value.length > 0)
    if (validItems.length == 0) { return }

    items = validItems
    reloadResultView()
})

$('#randomize-order-button-rerandomize').click(() => {
    reloadResultView()
})

$('#randomize-order-button-reset').click(() => {
    reloadCount = 0
    reloadEditView()
})

function selectedItem(selectedIndex) {
    for (let i = 0; i < items.length; ++i) {
        items[i].opacity = (i == selectedIndex ? 1 : 0.5)
    }

    $('#randomize-order-result-list-items').html(items.map(ResultItem).join(''));
    initializeAllChips()
}
/* #endregion */

/* #region Reload Views */
function reloadEditView() {
    items.forEach((item, index) => {
        item.index = index
        item.color = colorForItem(index)
    })
    
    $('#randomize-order-input-list-items').html(items.map(InputItem).join(''));
    makeLabelsDontOverlap()
    $('#randomize-order-result').hide()
    $('#randomize-order-setup').show()
}

function reloadResultView() {
    $('#randomize-order-result-number-of-times').html(`Reload count: ${++reloadCount}`)
    $('#randomize-order-result-last-randomized-datetime').html(`Time: ${new Date().toLocaleTimeString()}`)

    shuffleArray(items)
    for (let i = 0; i < items.length; ++i) {
        items[i].index = i
        items[i].opacity = (i == 0 ? 1 : 0.5)
    }

    $('#randomize-order-result-list-items').html(items.map(ResultItem).join(''));
    initializeAllChips()
    $('#randomize-order-setup').hide()
    $('#randomize-order-result').show()
}
/* #endregion */

/* #region Helper */
function saveItemValues() {
    $('.randomize-order-component-input-item').each((index, element) => {
        let item = items[index]
        item.value = $(element).find('.randomize-order-item-value')[0].value
    })
}

function colorForItem(itemIndex) {
    const colorIndex = itemIndex % Constants.colors.length
    return Constants.colors[colorIndex]
}

/**
 * Randomize array in-place using Durstenfeld shuffle algorithm 
 * Source: https://stackoverflow.com/a/12646864 
 */
function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

/**
 * Prevent labels overlapping prefilled content
 * Source: https://materializecss.com/text-inputs.html#:~:text=Prefilling%20Text%20Inputs
 */
function makeLabelsDontOverlap() {
    M.updateTextFields();
}

function initializeAllChips() {
    var elems = document.querySelectorAll('.chips');
    M.Chips.init(elems);
}
/* #endregion */

/* #region Template */
// Templating idea: https://stackoverflow.com/a/39065147 
const InputItem = ({ index, value, color }) => `
    <div class="row m-b-0 randomize-order-component-input-item">
        <div class="input-field col s11">
            <i class="material-icons prefix" style="color: ${color}">casino</i>
            <input class="randomize-order-item-value" id="randomize-order-input-text-${index}" type="text" value="${value}">
            <label for="randomize-order-input-text-${index}">Item ${index + 1}</label>
        </div>
        <div class="col s1 randomize-order-remove-icon-container">
            <a onclick="removeItem(${index})">
                <i class="material-icons randomize-order-remove-icon">remove_circle</i>
            </a>
        </div>
    </div>
`;

const ResultItem = ({ index, value, color, opacity }) => `
    <div class="row">
        <div class="randomize-order-result-item-container">
            <i class="material-icons prefix randomize-order-result-item-icon" 
                style="color: ${color}; opacity: ${opacity}"
                onclick="selectedItem(${index})">
                    casino
            </i>
            <div class="chip randomize-order-result-item" 
                style="background-color: ${color}; opacity: ${opacity}"
                onclick="selectedItem(${index})">
                    ${index + 1} - ${value}
            </div>
        </div>
    </div>
`;
/* #endregion */