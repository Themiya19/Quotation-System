# Deployment Guide for DSP Quotation System

This guide provides step-by-step instructions for deploying the DSP Quotation System on IIS with SQL Server.

## Prerequisites

1. Windows Server with IIS installed
2. SQL Server Management Studio (SSMS)
3. Node.js (LTS version)
4. .NET Framework 4.7.2 or later
5. URL Rewrite Module for IIS
6. Application Request Routing (ARR) for IIS

## Step 1: Database Setup

1. Open SQL Server Management Studio
2. Create a new database named `dsp_quotation_db`
3. Update the `.env` file with the following database connection string:
   ```
   DATABASE_URL="mysql://username:password@localhost:3306/dsp_quotation_db"
   ```
   Replace username and password with your SQL Server credentials

## Step 2: Build the Application

1. Open Command Prompt in the project directory
2. Install dependencies:
   ```bash
   npm install
   ```
3. Generate Prisma client:
   ```bash
   npx prisma generate
   ```
4. Build the application:
   ```bash
   npm run build
   ```

## Step 3: IIS Configuration

1. Open IIS Manager
2. Create a new Application Pool:
   - Name: `DSPQuotationPool`
   - .NET CLR Version: No Managed Code
   - Managed Pipeline Mode: Integrated

3. Create a new Website:
   - Name: `DSP Quotation System`
   - Physical Path: `[Your Project Path]\out`
   - Application Pool: `DSPQuotationPool`
   - Binding: Configure your desired hostname and port

4. Configure URL Rewrite:
   - Install URL Rewrite Module if not installed
   - Add the following web.config file in the root directory:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <rule name="Next.js Routes" stopProcessing="true">
                    <match url=".*" />
                    <conditions logicalGrouping="MatchAll">
                        <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
                        <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
                    </conditions>
                    <action type="Rewrite" url="/" />
                </rule>
            </rules>
        </rewrite>
        <handlers>
            <add name="iisnode" path="server.js" verb="*" modules="iisnode" />
        </handlers>
    </system.webServer>
</configuration>
```

## Step 4: Environment Configuration

1. Create a `.env` file in the root directory with the following variables:
   ```
   DATABASE_URL="mysql://username:password@localhost:3306/dsp_quotation_db"
   NEXTAUTH_URL="https://your-domain.com"
   NEXTAUTH_SECRET="your-secret-key"
   ```

2. Configure other environment variables as needed for your deployment

## Step 5: Application Deployment

1. Copy the following files/folders to your IIS website directory:
   - `.next` folder
   - `public` folder
   - `package.json`
   - `package-lock.json`
   - `.env`
   - `next.config.ts`
   - `node_modules` folder

2. Set appropriate permissions:
   - Give IIS_IUSRS read and execute permissions
   - Give the Application Pool identity read and execute permissions

## Step 6: Start the Application

1. In the IIS website directory, run:
   ```bash
   npm install
   npm run start
   ```

2. Configure the website to start automatically:
   - Open IIS Manager
   - Select your website
   - In the Actions panel, click "Start"

## Step 7: SSL Configuration (Optional but Recommended)

1. Install SSL certificate in IIS
2. Add HTTPS binding to your website
3. Configure URL Rewrite rules to force HTTPS

## Step 8: Monitoring and Maintenance

1. Set up application logging:
   - Configure IIS logging
   - Set up error pages
   - Monitor application pool recycling

2. Regular maintenance tasks:
   - Database backups
   - Log rotation
   - Performance monitoring

## Troubleshooting

1. If the application doesn't start:
   - Check IIS logs
   - Verify environment variables
   - Check database connection
   - Verify file permissions

2. If you see 500 errors:
   - Check application logs
   - Verify Node.js version
   - Check database connectivity
   - Verify all required modules are installed

3. If you see 404 errors:
   - Verify URL Rewrite rules
   - Check file permissions
   - Verify the build output is correct

## Security Considerations

1. Keep Node.js and npm packages updated
2. Regularly update SSL certificates
3. Implement proper authentication and authorization
4. Configure proper CORS policies
5. Set up proper firewall rules
6. Regular security audits

## Backup and Recovery

1. Database backups:
   - Set up regular SQL Server backups
   - Test backup restoration procedures

2. Application backups:
   - Backup the entire application directory
   - Keep deployment packages
   - Document rollback procedures

## Support

For any deployment-related issues, please contact your system administrator or refer to the following resources:
- IIS Documentation
- SQL Server Documentation
- Next.js Deployment Guide
- Prisma Documentation 