# AWS Serverless Lambda HTTP API

Deploys a serverless, highly-scalable backend API using AWS Lambda triggered by an API Gateway HTTP API.

## Architecture

- **HTTP API**: High-performance, low-latency API Gateway v2 routing all requests (`ANY /{proxy+}`) to the Lambda backend.
- **Lambda Function**: Running Node.js, Python, or Go code. Boots with a default "Hello World" function template.
- **CloudWatch logs**: Dedicated log groups capturing API execution traces and stdout/stderr print output.
- **IAM execution role**: Hardened role carrying only execution-level permissions.
- **Environment config**: Customizable environment variables key-value configuration.
