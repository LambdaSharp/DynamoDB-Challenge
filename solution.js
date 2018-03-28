var AWS = require('aws-sdk');

exports.handler = (event, context, callback) => {

    // --- bootstrap ---

    AWS.config.update({ region: 'us-west-2' });
    var s3 = new AWS.S3({ apiVersion: '2006-03-01' });
    var db = new AWS.DynamoDB({ apiVersion: '2012-10-08' });
    var docClient = new AWS.DynamoDB.DocumentClient();

    // --- constants ---

    var fileName = event.Records[0].s3.object.key.split('/')[event.Records[0].s3.object.key.split('/').length - 1];
    var split = fileName.split(/[.-]/);
    var keyword = split[0];
    var country = split[1];
    var tableName = 'googleTrends';
    
    // extract json file location from event
    var bucket = event.Records[0].s3.bucket.name;
    var key = event.Records[0].s3.object.key;

    // --- logic ---

    // recursive function that is called after result json is obtained from S3
    function parseTimeline(timelineArray, next) {
        var updateExpression, expressionAttributeValues;
        var length, average, totalSum, totalCount, newSum, newCount, newAverage;
        var params, date, value;

        date = timelineArray[0].time;
        value = parseInt(timelineArray[0].value[0], 10);
        timelineArray.shift();
 
        // retrieve item in case it already exists
        params = {
            'AttributesToGet': [keyword],
            'Key': {
                'Date': {
                    'N': date
                }

            },
            'TableName': tableName
        }
        return db.getItem(params, function(error, data) {
            if(error) console.error(error, error.stack);
            console.log('Successfully retrieved item', `${key}-${keyword}`);
        }).promise().then(function(data) {

            // if item does exist, store the values
            var countryList = [];
            try {
                length = Object.keys(data.Item).length;
                average = parseInt(data.Item[keyword].M.calc.M.average.N, 10);
                totalSum = parseInt(data.Item[keyword].M.calc.M.totalSum.N, 10);
                totalCount = parseInt(data.Item[keyword].M.calc.M.totalCount.N, 10);
                dbCountryList = data.Item[keyword].M.calc.M.countryList.L;


                for(var i = 0; i < dbCountryList.length; i++) {
                    countryList.push(dbCountryList[i].S);
                }

                if(countryList.includes(country)) {
                    newSum = totalSum;
                    newCount = totalCount;
                    newAverage = totalSum/totalCount;
                } else {
                    newSum = totalSum + value;
                    newCount = totalCount + 1;
                    newAverage = newSum / newCount;
                    countryList.push(country);
                }
            } catch(e) {
                length = 0;
            }

            // if item does exist, update item with calculated values
            if(length > 0) {
                updateExpression = `set ${keyword}.${country} = :c, ${keyword}.calc.totalSum = :t, ${keyword}.calc.totalCount = :i, ${keyword}.calc.average = :a, ${keyword}.calc.countryList = :l`;
                expressionAttributeValues = {
                    ':c': value,
                    ':t': newSum,
                    ':i': newCount,
                    ':a': newAverage,
                    ':l': countryList
                }

            // if item does not exist, create new item
            } else {
                updateExpression = `set ${keyword} = :k`;
                expressionAttributeValues = {
                    ':k': {
                        [country]: value,
                        'calc': {
                            'average': value,
                            'totalSum': value,
                            'totalCount': 1,
                            'countryList': [country]
                        }
                    }
                }
            }

            // update table with item
            var params = {
                TableName: tableName,
                Key: {
                    'Date': parseInt(date, 10)
                },
                UpdateExpression: updateExpression,
                ExpressionAttributeValues: expressionAttributeValues
            }
            return docClient.update(params, function(error, data) {
                if(error) console.error(error, error.stack)
                if(timelineArray.length > 0) {
                    parseTimeline(timelineArray, next);
                }
                console.log('Success');
            });
        });
    }

    // get s3 json result and run recursive function
    var params = {
        Bucket: bucket,
        Key: key
    }
    s3.getObject(params, function(err, data) {
        if(err) {
            console.error(err, err.stack);
            callback(err);
        } else {
            console.log('Success: ', bucket + '/' +  key);
            var timelineData = JSON.parse(data.Body.toString('utf-8')).default.timelineData;
            return parseTimeline(timelineData, callback);
        }
    });
};