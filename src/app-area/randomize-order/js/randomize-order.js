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
    $('.randomize-order-input-list-items').append(newElement)
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

    $('#randomize-order-input-list-items').hide()
})
/* #endregion */

/* #region Helper */
function saveItemValues() {
    $('.randomize-order-component-input-item').each((index, element) => {
        let item = items[index]
        item.value = $(element).find('.randomize-order-item-value')[0].value
    })
}

function reloadEditView() {
    items.forEach((item, index) => {
        item.index = index
        item.color = colorForItem(index)
    })
    $('.randomize-order-input-list-items').html(items.map(InputItem).join(''));
    makeLabelsDontOverlap()
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

const ResultItem = ({ index, value, color }) => `
    <div class="row m-b-0 randomize-order-component-input-item">
        <div class="col s1">
            1.
        </div>
        <div class="input-field col s10">
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
/* #endregion */