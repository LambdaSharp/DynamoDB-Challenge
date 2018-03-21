var AWS = require('aws-sdk');
var googleTrends = require('google-trends-api');
exports.handler = (event, context, callback) => {
    var db = new AWS.DynamoDB({ apiVersion: '2012-10-08' });
    var s3 = new AWS.S3({ apiVersion: '2006-03-01' });

    // environment variables
    var awsRegion = process.env.REGION;
    var s3Bucket = process.env.S3_BUCKET;

    // event variables
    var keywords = event.keywords;
    var countries = event.countries;

    function getGoogleTrends(keyword, country) {
        var date = new Date(Date.now());
        var endDate = new Date(date);
        var startDate = date.setDate(date.getDate() - 365);

        return googleTrends.interestOverTime({
            keyword: keyword,
            startTime: new Date(startDate),
            endTime: new Date(endDate),
            geo: country
        }).then(function(results) {
            AWS.config.update({ region: awsRegion });
            var params = {
                Bucket: s3Bucket,
                Key: `${keyword}-${country}.json`,
                Body: results
            }
            return s3.putObject(params, function(error, data) {
                if(error) console.log('Error', error);
                console.log('Success', `${s3Bucket}/${params.Key}`)
            });
        }).catch(function(error) {
            console.error(error);
        });
    }

    for(var i = 0; i < keywords.length; i++) {
        for(var j = 0; j < countries.length; j++) {
            getGoogleTrends(keywords[i], countries[j]);
        }
    }
};