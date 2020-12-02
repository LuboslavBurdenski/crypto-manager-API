let positionModel = require('../models/postModel');
let userModel = require('../models/userModel');
let coinData = require('../nodeCron/nodeCron');
let updatedCoins = require('../controllers/coinsController');

function createPosition(req, res, next) {
    const { _id: userId } = req.user;
    let { symbol, coinId, entry, stop, sum, notes, target, shares } = req.body;
    entry = +entry;
    target = +target;
    stop = +stop;
    sum = +sum;

    let dataForSelectedCoin = JSON.parse(coinData.dataGet()).find(coin => coin.id === coinId);

    let changeIn24h = dataForSelectedCoin.price_change_percentage_24h_in_currency;
    let currentPrice = 0;
    let prfLoss = 0
    let prfLossPerCent = 0;

    let allShares;
    let allSum;
    let avgEntry;
    userModel.findById(userId)
        .populate('positions')
        .then(r => {
            let isExists = r.positions.filter((trade) => trade.symbol === symbol)[0];
            if (!!isExists) {
                
                allSum = isExists.sum + sum;
                allShares = isExists.shares + shares;
                avgEntry = allSum / allShares;

                console.log('pos update in');
                positionModel
                    .findOneAndUpdate({ _id: isExists._id }, { entry: avgEntry, sum: allSum, shares: allShares })
                    .then(result => { res.status(200).json({ message: 'Successfully added to the older position!' }) })
                    .catch(next);
            } else {
                console.log('pos update out');
                positionModel.create({
                    symbol, coinId, entry, sum, shares, target, stop, currentPrice, prfLoss, prfLossPerCent,
                    changeIn24h, notes, creator: userId
                })
                    .then(newPosition => {
                        userModel.updateOne({ _id: userId }, { $push: { positions: newPosition._id } })
                            .then((result) => {
                                console.log(result);
                                res.status(200).json({ message: 'Successfully opened position!' });
                            })
                            .catch(next);
                    })
                    .catch(next);
            }
        })
        .catch(e => console.log(e));
}

function getAllPositions(req, res, next) {
    res.status(200).json(updatedCoins.getUpdatedData());
}

module.exports = {
    createPosition,
    getAllPositions
}