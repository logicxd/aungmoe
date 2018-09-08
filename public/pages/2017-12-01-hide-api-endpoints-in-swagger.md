---
title:  "Hide Swagger API Endpoints for ASP.NET Core"
date:   2017-12-01
updatedDate: 2018-09-08
category: AspNetCore
urlName: hide-swagger-api-endpoints-for-aspnet-core
---

Hides API endpoints and object models from non-authenticated users to hide information that should only be available to the developers of the project.  

This is a modification from [jenyayel’s guide](https://github.com/jenyayel/SwaggerSecurityTrimming) which restricts certain endpoints to all authorized users. There are two implementations: 
* Password Protected - requires a password to unlock API endpoints. 
* Restricted to Token Authorized Users - requires token authentication of the user to be passed in the header.  

### Requirements & Software

* ASP.NET Core 2.0.
* Swashbuckle v1.1.0 - Download from NuGet or [here](https://www.nuget.org/packages/Swashbuckle.AspNetCore/).
* Swagger already enabled.

### Method 1: Password Protected

![Password Authorize](/img/pages/2017-12-01-hide-api-endpoints-in-swagger/password-authorize.png)

Allows the API endpoints and object models to be visible to users by entering a correct password.

Create a file and name it something like `SwaggerAuthorizationFilter.cs` with the contents:
``` csharp
// Modified from: https://github.com/jenyayel/SwaggerSecurityTrimming/blob/master/src/V2/SwaggerAuthorizationFilter.cs 
public class SwaggerAuthorizationFilter : IDocumentFilter 
{
    private IServiceProvider _provider;

    public SwaggerAuthorizationFilter(IServiceProvider provider) 
    { 
        if (provider == null) throw new ArgumentNullException(nameof(provider)); 

        this._provider = provider; 
    } 
    
    public void Apply(SwaggerDocument swaggerDoc, DocumentFilterContext context) 
    { 
        var http = this._provider.GetRequiredService<IHttpContextAccessor>();
        var password = "mySecretPassword!"; 
        var header = http.HttpContext.Request.Headers["Swagger-Content"]; 
        var show = password.Equals(header.FirstOrDefault()); 

        if (!show) 
        { 
            #region Hide method endpoints 
            var descriptions = context.ApiDescriptionsGroups.Items.SelectMany(group => group.Items);
            
            foreach (var description in descriptions) 
            { 
                var route = "/" + description.RelativePath.TrimEnd('/');
                var path = swaggerDoc.Paths[route];

                // remove method or entire path (if there are no more methods in this path)
                switch (description.HttpMethod)
                {
                    case "DELETE": path.Delete = null; break;
                    case "GET": path.Get = null; break;
                    case "HEAD": path.Head = null; break;
                    case "OPTIONS": path.Options = null; break;
                    case "PATCH": path.Patch = null; break;
                    case "POST": path.Post = null; break;
                    case "PUT": path.Put = null; break;
                    default: throw new ArgumentOutOfRangeException("Method name not mapped to operation");
                }

                if (path.Delete == null && path.Get == null &&
                    path.Head == null && path.Options == null &&
                    path.Patch == null && path.Post == null && path.Put == null)
                    swaggerDoc.Paths.Remove(route);
            }
            #endregion

            #region Hide models 
            swaggerDoc.Definitions.Clear(); 
            #endregion
        }
    }
}
```

Then add these inside your `Startup.cs` inside `ConfigureServices` method:
``` csharp
services.AddSwaggerGen(c => 
{ 
    c.AddSecurityDefinition( "Swagger", // Must be unique from other 'AddSecurityDefinition' names
    new ApiKeyScheme() 
    { 
        In = "header", 
        Description = "Put password to see Swagger API endpoints.", 
        Name = "Swagger-Content", // Can change to any header name you want.
        Type = "apiKey" 
    }); 
    c.DocumentFilter<SwaggerAuthorizationFilter>(); // Filters API endpoints and models from showing up. 
});
```

And that should be it!

### Method 2: Restricted to Token Authorized Users


