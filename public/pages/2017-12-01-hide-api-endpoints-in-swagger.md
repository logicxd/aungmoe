---
title:  "Hide Swagger API Endpoints for ASP.NET Core"
date:   2017-12-01
updatedDate: 2018-09-10
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
// SwaggerAuthorizationFilter.cs
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
        var password = "mySecretPassword!";         // Password hard coded for brievity. 
                                                    // When using this in a real application, you should store the password safely using appsettings or some other method.
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

Basically what it does is that it first checks to see if the entered password matches. 
Then it iterates through all the visible endpoints found for Swagger and then it deletes them from the path so that they don't show up. 
And then it also deletes all the models as there was a way for the frontend to see model information.
This is particularly useful when you don't want others to know how your model looked like to hide any kind of information from leaking.

Then add these inside your `Startup.cs` inside `ConfigureServices` method:
``` csharp
// Startup.cs inside ConfigureServies method.
services.AddSwaggerGen(c => 
{ 
    c.AddSecurityDefinition( "Swagger", // Must be unique from other 'AddSecurityDefinition' names
    new ApiKeyScheme() 
    { 
        In = "header", 
        Description = "Put password to see Swagger API endpoints.", 
        Name = "Swagger-Content", // Can change to any header name you want. Must match the header in the SwaggerAuthorizationFilter.cs file
        Type = "apiKey" 
    }); 
    c.DocumentFilter<SwaggerAuthorizationFilter>(); // Filters API endpoints and models from showing up. 
});
```

And that should be it! Run the application and test it out.

### Method 2: Restricted to Token Authorized Users

Allows the API endpoints and object models to be visible only to authorized users.
First, your application must have enabled a form of token authentication (such as JWT bearer tokens, here is an [article](https://developer.okta.com/blog/2018/03/23/token-authentication-aspnetcore-complete-guide)). 

Create a file and name it something like `SwaggerAuthorizationFilter.cs` with the contents:
``` csharp
// SwaggerAuthorizationFilter.cs
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
        var authorizedIds = new[] { "00000000-1111-2222-1111-000000000000" };   // All the authorized user id's.
                                                                                // When using this in a real application, you should store these safely using appsettings or some other method.
        var userId = http.HttpContext.User.Claims.Where(x => x.Type == "jti").Select(x => x.Value).FirstOrDefault();
        var show = http.HttpContext.User.Identity.IsAuthenticated && authorizedIds.Contains(userId);

        if (!show) 
        { 
            #region Hide method endpoints 
            var descriptions = context.ApiDescriptionsGroups.Items.SelectMany(group => group.Items);
            
            foreach (var description in descriptions) 
            { 
                // Expose login so users can login through Swagger. 
                if (description.HttpMethod == "POST" && description.RelativePath == "v1/users/login") 
                    continue;

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
            var loginRequest = "MySolution.Common.Models.LoginRequest"; 
            var loginRequestModel = context.SchemaRegistry.Definitions[loginRequest]; 
            var booleanApiResult = "MySolution.Common.Results.BooleanApiResult"; 
            var booleanApiResultModel = context.SchemaRegistry.Definitions[booleanApiResult];

            swaggerDoc.Definitions.Clear(); 

            if (loginRequestModel != null) 
            { 
                swaggerDoc.Definitions.Add(loginRequest, loginRequestModel); 
            } 
            if (booleanApiResultModel != null) 
            { 
                swaggerDoc.Definitions.Add(booleanApiResult, booleanApiResultModel); 
            }
            #endregion
        }
    }
}
```

The idea is not too different from before except that now it'll check for the authorized user's ID to decide whether or not to show the endpoints.
This hide everything except the login endpoint for the end users so that they can grab the authentication token to login. 

Your `Startup.cs` in the `ConfigureServices` method will now contain this instead:
``` csharp
// Startup.cs inside ConfigureServies method.
services.AddSwaggerGen(c => 
{ 
    c.AddSecurityDefinition("Bearer", new ApiKeyScheme()
    {
        In = "header",
        Description = "Put your Access Token in the format of 'Bearer ACCESS_TOKEN' to see endpoints.",
        Name = "Authorization",
        Type = "apiKey"
    });
    c.DocumentFilter<SwaggerAuthorizationFilter>(); // Filters API endpoints and models from showing up. 
});
```

And that's it! This should allow you to enable certain accounts (differentiated by user id's) to be able to see the full swagger API documentations. 

