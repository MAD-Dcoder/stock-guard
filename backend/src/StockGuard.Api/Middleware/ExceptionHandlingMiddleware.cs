using System.Net;
using Microsoft.AspNetCore.Mvc;
using StockGuard.Domain.Exceptions;

namespace StockGuard.Api.Middleware;

public class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            var (statusCode, title) = ex switch
            {
                NotFoundException => (HttpStatusCode.NotFound, "Recurso não encontrado"),
                ConflictException => (HttpStatusCode.Conflict, "Conflito de estoque ou duplicidade"),
                DomainException => (HttpStatusCode.BadRequest, "Requisição inválida"),
                _ => (HttpStatusCode.InternalServerError, "Erro interno no servidor")
            };

            if (statusCode == HttpStatusCode.InternalServerError)
                logger.LogError(ex, "Erro inesperado ao processar {Method} {Path}", context.Request.Method, context.Request.Path);

            context.Response.StatusCode = (int)statusCode;
            context.Response.ContentType = "application/problem+json";

            var problem = new ProblemDetails
            {
                Status = (int)statusCode,
                Title = title,
                Detail = statusCode == HttpStatusCode.InternalServerError
                    ? "Ocorreu um erro inesperado. Tente novamente."
                    : ex.Message,
                Instance = context.Request.Path
            };

            await context.Response.WriteAsJsonAsync(problem);
        }
    }
}
