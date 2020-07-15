
// dependencies
const AWS = require('aws-sdk');
const util = require('util');
const sharp = require('sharp');
const path = require('path');

// get reference to S3 client
const s3 = new AWS.S3();

exports.handler = async (event, context, callback) => {


    // set thumbnail width. Resize will set the height automatically to maintain aspect ratio.
    const widthArr = [100, 255, 700, 1920];
    const originalFolder = "full/";
    // Read options from the event parameter.
    console.log("Reading options from event:\n", util.inspect(event, { depth: 5 }));
    const srcBucket = event.Records[0].s3.bucket.name;
    // Object key may have spaces or unicode non-ASCII characters.
    const srcKey = decodeURIComponent(path.basename(event.Records[0].s3.object.key).replace(/\+/g, " "));

    // Infer the image type from the file suffix.
    const typeMatch = srcKey.match(/\.([^.]*)$/);
    if (!typeMatch) {
        console.log("Could not determine the image type.");
        return;
    }

    // Check that the image type is supported  
    const imageType = typeMatch[1].toLowerCase();
    if (imageType != "jpg" && imageType != "png") {
        console.log(`Unsupported image type: ${imageType}`);
        return;
    }

    // Download the image from the S3 source bucket. 

    try {
        const params = {
            Bucket: srcBucket,
            Key: originalFolder + srcKey
        };
        var origimage = await s3.getObject(params).promise();

    } catch (error) {
        console.log(error);
        return;
    }

    for (var i = 0; i < widthArr.length; i++) {

        let dstKey = widthArr[i] + "x" + widthArr[i] + "/" + srcKey;

        // Use the Sharp module to resize the image and save in a buffer.
        try {
            var buffer = await sharp(origimage.Body).resize(widthArr[i]).toBuffer();

        } catch (error) {
            console.log(error);
            return;
        }

        // Upload the thumbnail image to the destination bucket
        try {
            var destparams = {
                Bucket: srcBucket,
                Key: dstKey,
                Body: buffer,
                ContentType: "image"
            };

            var putResult = await s3.putObject(destparams).promise();

        } catch (error) {
            console.log(error);
            return;
        }

        console.log('Successfully resized ' + srcBucket + '/' + srcKey +
            ' and uploaded to ' + srcBucket + '/' + dstKey);

    }


};