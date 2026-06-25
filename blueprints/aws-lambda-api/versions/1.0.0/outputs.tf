output "api_endpoint" {
  description = "The base HTTP API endpoint URL."
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "lambda_function_name" {
  description = "The name of the Lambda function created."
  value       = aws_lambda_function.api.function_name
}

output "lambda_role_arn" {
  description = "The IAM execution role ARN."
  value       = aws_iam_role.lambda.arn
}
