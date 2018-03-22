# λ# Store Data with Lambda and DynamoDB - March 2018 Team Hackathon Challenge

DynamoDB, a NoSQL database, allows quick prototyping as a strict schema does not need to be formulated. With some data input management, data throughput can scale easily to store large amounts of data.

In this challenge, a [google trends](https://trends.google.com/trends/) client (provided) will output a JSON into an S3 bucket. This JSON contains the popularity of specified search keywords for specified countries over a year time period. 

Your Employer would like to scrape data on certain search keywords for a given list of countries. For now, he is satisfied with storing the **average** popularity of the keywords of the selected countries, while still keeping the country specific values. 

Using AWS, come up with a serverless way to solve this task!

The tools we will be using are:
- [Lambda](https://aws.amazon.com/lambda/) - run code without servers
- [S3](https://aws.amazon.com/s3/) - object store
- [DynamoDB](https://aws.amazon.com/dynamodb/) - NoSQL database
- [CloudWatch](https://aws.amazon.com/cloudwatch/) - console monitor
- [IAM](https://aws.amazon.com/iam/) - permission management


### Pre-requisites
The following languages are made available by Lambda:
- NodeJs
- Java
- C#
- Python
- Go

Follow these instructions to deploy code using Lambda with your choice of language: [Authoring Code for Your Lambda Function](https://docs.aws.amazon.com/lambda/latest/dg/lambda-app.html#lambda-app-author)

## LEVEL 0 - Setup

### A) Pick a Region
Many of AWS's services require a region configuration. Many services also do not allow cross region communication, so be sure to pick a region and stick with it throughout the challenge. 
* **us-east-1** & **us-west-2** are recommended. 

### B) Create an IAM Role
An AWS IAM role needs to be created in order to delegate permissions to our Lambda function. Attaching the following permissions will allow the Lambda function to communicate with S3 and DynamoDB.
- AmazonS3FullAccess
- AmazonDynamoDBFullAccess 

Create an IAM role through the AWS Console using the instructions here: [Creating a Role for an AWS Service (Console)](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-service.html#roles-creatingrole-service-console)

### C) Create an S3 Bucket
Create an S3 Bucket that will be used to store the JSON results from the Google Trends Client using the instructions found here: [Create a Bucket](https://docs.aws.amazon.com/AmazonS3/latest/gsg/CreatingABucket.html)

### D) Create a DynamoDB Table
Create a DynamoDB Table with default settings. Use **{Date}** as the Primary Key with a **Number** data type.

----

## LEVEL 1 - Deploy the Google Trends Client

GOAL: Store Google Trends results into S3.

### A) Creating the lambda function template
1. Navigate to your [Lambda Console](console.aws.amazon.com/lambda) and click **Create function**.
2. Keep the default **Author from scratch** selected.
3. Name your function.
4. Keep the default **Runtime** (NodeJs).
5. Select the role you created from the **Existing Role** dropdown.
6. Click **Create function** to create function

### B) Uploading Google Trends Client Zip file
1. From the **Function code** window, select **Upload a .ZIP file**
2. Click **Upload**, and select the [Google Trends Client ZIP](./GoogleTrendsClient/Archive.zip).
3. Click **Save** at the top right of the page.
4. The page should refresh and you should see the Google Trends Client source code from the inline editor

### C) Environment Variables
1. From the inline editor, locate the **process.env.{variable}** variables.
2. From the **Environment variables** window, define the environment variables.
3. **Save** your changes

### D) Lambda Permissions
1. From the **Execution role** window, chose the existing role you created earlier.

### E) Adding a DynamoDB Trigger to Lambda
1. From the **Designer** window, select the DynamoDB option below **Add triggers**. 
2. A **Configure triggers** window should appear
3. Select the DynamoDB Table that you created earlier
4. Leave the **Batch size** and **Starting position** at their defaut values
5. Click **Add** and ensure the **Enabled** slider is set to true.
    
### F) Google Trends Client Usage
(Graphic User Interface)
1. From the top of the Lambda console, click the **Select a test event** dropdown and select **Configure test events**.
2. Give your test a name.
3. Add the following to your test code:
    
    {"keywords": ["cat"],"countries": ["US"]}
4. Click **Create**.
5. With your test selected, click **Test** to use it as a payload to your function.
6. Verify the result file was stored in your S3 Bucket.

-or-

(Command Line Interface)
1. Install the AWS CLI using the instructions found here: [Installing the AWS Command Line Interface](https://docs.aws.amazon.com/cli/latest/userguide/installing.html) 
2. Configure your AWS CLI using the instructions found here: [Configuring the AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html)
3. Run the following command: 
   
   aws lambda invoke --function-name {YOUR_FUNCTION_NAME} --region {YOUR_AWS_REGION} --payload '{"keywords": ["cat"],"countries": ["US"]}' outputfile.txt

   -or-
    
   aws lambda invoke --function-name {YOUR_FUNCTION_NAME} --region {YOUR_AWS_REGION} --payload file://./payload.json outputfile.txt
4. Verify the result file was stored in your S3 Bucket.
----

## Level 2 - Lambda Function to Parse JSON

GOAL: Pass in a single keyword with a single country, and verify the DynamoDB table gets updated with results.

### A) Reading from S3
1. Using the AWS-SDK for your language of choice, use the **getObject** method to retrieve the JSON file stored by the Google Trends Client.

### B) Storing Data in DynamoDB
1. Use the **putItem** method to add the processed items to the table, one-by-one.

    -or-

2. Use the **batchWriteItem** method to add the processed items to the table.
    >NOTE: batchWriteItem will limit to 25 items at once

### C) Adding S3 Trigger
1. Setup an S3 trigger, pointed to the bucket that the Google Trends Client is dumping to. 

### D) Verify it works!
1. Trigger the Google Trends Client.
2. Verify that the respective JSON file is stored in S3.
3. Verify that the JSON data is parsed and stored into the DynamoDB Table.

----

## Level 3 - Store Results for Multiple Keywords

GOAL: Pass in multiple keywords and a single country, and verify DynamoDB table updates the results. Each column should hold a separate keyword. 

### A) Modify Code to Allow Multiple Keyword Entries
1. Expand your Lambda function to allow a user request multiple keywords. 
    > NOTE: putItem will overwrite the item and delete attributes not included in the payload. Due to this, the **update** method using the **DynamoDB Document Client** may be a better option. Helpful documentation on **update**: [Update Expressions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html#Expressions.UpdateExpressions.SET.AddingListsAndMaps) & [Create, Read, Update, and Delete an Item](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GettingStarted.NodeJs.03.html)

----
## Level 4 - Find keywords in multiple countries

GOAL: Pass in multiple keywords and multiple countries, and verify DynamoDB table updates the results. The results should be stored with country values for a specific keyword in a single column, with each column representing a keyword.

### A) Modify Code to Allow Multiple Keywords and Countries
1. Expand your Lambda function to allow a user request multiple keywords and multiple countries. 
    > NOTE: A initial check may be required to verify if the item already exists, in order to verify the proper schema is there. Update Expressions will not work if the expected schema does not already exist. 

----

## BOSS LEVEL - Find the Average

GOAL: Pass in multiple keywords and multiple countries, and verify DynamoDB table updates the results. The results should be stored similarly to Level 4, this time, including the average popularity in all the countries requested. 

----

## Copyright & License
* Copyright (c) 2018 Daniel Lee
* MIT License