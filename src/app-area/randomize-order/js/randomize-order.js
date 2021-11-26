
const PlayerInputItem = ({ playerNumber, color }) => `
    <div class="row m-b-0">
        <div class="input-field">
            <i class="material-icons prefix" style="color:${color}">account_circle</i>
            <input id="player-input-${playerNumber}" type="text">
            <label for="player-input-${playerNumber}">Player ${playerNumber}</label>
        </div>
    </div>
`;

$(document).ready(function () {
    $('.randomize-order-input-list-players').html([
        { playerNumber: 1, color: "inherit"},
        { playerNumber: 2, color: "red"},
    ].map(PlayerInputItem).join(''));
});

