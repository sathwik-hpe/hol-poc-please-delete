# Jenkins CI/CD for Infrastructure Automation

## Table of Contents
- [Jenkins Fundamentals](#jenkins-fundamentals)
- [Pipeline as Code](#pipeline-as-code)
- [Terraform Integration](#terraform-integration)
- [AWS Integration](#aws-integration)
- [Best Practices](#best-practices)
- [Interview Questions](#interview-questions)

---

## Jenkins Fundamentals

### What is Jenkins?

**Jenkins** is an open-source automation server used for continuous integration and continuous deployment (CI/CD).

**Key Features:**
- **Extensible**: 1800+ plugins
- **Distributed**: Master-agent architecture
- **Pipeline as Code**: Jenkinsfile
- **Integration**: Git, Docker, Kubernetes, AWS, etc.

### Installation

```bash
# macOS
brew install jenkins-lts
brew services start jenkins-lts

# Access Jenkins at http://localhost:8080
# Initial admin password at:
cat ~/.jenkins/secrets/initialAdminPassword

# Install recommended plugins
# Create admin user
```

### Core Concepts

**1. Jobs/Projects:**
- Freestyle Project (GUI-based)
- Pipeline (code-based, recommended)
- Multi-branch Pipeline

**2. Builds:**
- Execution of a job
- Build history and logs
- Build artifacts

**3. Agents/Nodes:**
- Master: Schedules builds, manages agents
- Agent: Executes builds

**4. Workspace:**
- Directory where build happens
- Contains checked-out code

**5. Plugins:**
- Extend Jenkins functionality
- AWS, Git, Docker, Terraform, etc.

---

## Pipeline as Code

### Declarative Pipeline

```groovy
// Jenkinsfile
pipeline {
    agent any
    
    environment {
        AWS_REGION = 'us-east-1'
        TF_VERSION = '1.6.0'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Build') {
            steps {
                echo 'Building...'
                sh 'echo "Build step"'
            }
        }
        
        stage('Test') {
            steps {
                echo 'Testing...'
                sh 'echo "Test step"'
            }
        }
        
        stage('Deploy') {
            steps {
                echo 'Deploying...'
                sh 'echo "Deploy step"'
            }
        }
    }
    
    post {
        always {
            echo 'Pipeline finished'
        }
        success {
            echo 'Pipeline succeeded!'
        }
        failure {
            echo 'Pipeline failed!'
        }
    }
}
```

### Scripted Pipeline

```groovy
// More flexible but complex
node {
    stage('Checkout') {
        checkout scm
    }
    
    stage('Build') {
        sh 'echo "Building"'
    }
    
    try {
        stage('Test') {
            sh 'echo "Testing"'
        }
    } catch (Exception e) {
        echo "Tests failed: ${e}"
        throw e
    }
    
    stage('Deploy') {
        sh 'echo "Deploying"'
    }
}
```

### Agent Configuration

```groovy
pipeline {
    // Run on any available agent
    agent any
    
    stages {
        stage('Build on Linux') {
            agent {
                label 'linux'
            }
            steps {
                sh 'make build'
            }
        }
        
        stage('Build in Docker') {
            agent {
                docker {
                    image 'python:3.11'
                    args '-v /tmp:/tmp'
                }
            }
            steps {
                sh 'python --version'
                sh 'pip install -r requirements.txt'
            }
        }
        
        stage('Build on Specific Node') {
            agent {
                label 'high-memory'
            }
            steps {
                sh 'heavy-workload.sh'
            }
        }
    }
}
```

### Environment Variables

```groovy
pipeline {
    agent any
    
    environment {
        // Global environment variables
        AWS_REGION = 'us-east-1'
        PROJECT_NAME = 'myapp'
        
        // Credentials from Jenkins
        AWS_ACCESS_KEY_ID = credentials('aws-access-key')
        AWS_SECRET_ACCESS_KEY = credentials('aws-secret-key')
        
        // Dynamic value
        BUILD_VERSION = "${env.BUILD_NUMBER}-${env.GIT_COMMIT.take(7)}"
    }
    
    stages {
        stage('Show Environment') {
            steps {
                sh 'echo "Region: $AWS_REGION"'
                sh 'echo "Version: $BUILD_VERSION"'
                sh 'env | sort'
            }
        }
        
        stage('Stage-specific Environment') {
            environment {
                STAGE_VAR = 'stage-value'
            }
            steps {
                sh 'echo $STAGE_VAR'
            }
        }
    }
}
```

### Parameters

```groovy
pipeline {
    agent any
    
    parameters {
        // String parameter
        string(
            name: 'ENVIRONMENT',
            defaultValue: 'dev',
            description: 'Target environment'
        )
        
        // Choice parameter
        choice(
            name: 'AWS_REGION',
            choices: ['us-east-1', 'us-west-2', 'eu-west-1'],
            description: 'AWS Region'
        )
        
        // Boolean parameter
        booleanParam(
            name: 'RUN_TESTS',
            defaultValue: true,
            description: 'Run tests'
        )
        
        // Text parameter
        text(
            name: 'DEPLOYMENT_NOTES',
            defaultValue: '',
            description: 'Deployment notes'
        )
    }
    
    stages {
        stage('Deploy') {
            steps {
                echo "Deploying to ${params.ENVIRONMENT}"
                echo "Region: ${params.AWS_REGION}"
                
                script {
                    if (params.RUN_TESTS) {
                        echo "Running tests..."
                    }
                }
            }
        }
    }
}
```

### When Conditions

```groovy
pipeline {
    agent any
    
    stages {
        stage('Build') {
            steps {
                sh 'make build'
            }
        }
        
        stage('Deploy to Dev') {
            when {
                branch 'develop'
            }
            steps {
                echo 'Deploying to dev...'
            }
        }
        
        stage('Deploy to Staging') {
            when {
                branch 'staging'
            }
            steps {
                echo 'Deploying to staging...'
            }
        }
        
        stage('Deploy to Production') {
            when {
                allOf {
                    branch 'main'
                    environment name: 'DEPLOY_TO_PROD', value: 'true'
                }
            }
            steps {
                input message: 'Deploy to production?', ok: 'Deploy'
                echo 'Deploying to production...'
            }
        }
        
        stage('Run Tests') {
            when {
                expression { return params.RUN_TESTS }
            }
            steps {
                sh 'pytest'
            }
        }
    }
}
```

### Parallel Stages

```groovy
pipeline {
    agent any
    
    stages {
        stage('Build') {
            steps {
                sh 'make build'
            }
        }
        
        stage('Tests') {
            parallel {
                stage('Unit Tests') {
                    steps {
                        sh 'pytest tests/unit'
                    }
                }
                
                stage('Integration Tests') {
                    steps {
                        sh 'pytest tests/integration'
                    }
                }
                
                stage('Security Scan') {
                    steps {
                        sh 'bandit -r src/'
                    }
                }
            }
        }
        
        stage('Deploy') {
            steps {
                echo 'Deploying...'
            }
        }
    }
}
```

---

## Terraform Integration

### Basic Terraform Pipeline

```groovy
pipeline {
    agent any
    
    environment {
        AWS_DEFAULT_REGION = 'us-east-1'
        TF_IN_AUTOMATION = 'true'
        TF_INPUT = 'false'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Terraform Init') {
            steps {
                dir('terraform') {
                    sh 'terraform init -backend=true -get=true'
                }
            }
        }
        
        stage('Terraform Validate') {
            steps {
                dir('terraform') {
                    sh 'terraform validate'
                }
            }
        }
        
        stage('Terraform Format Check') {
            steps {
                dir('terraform') {
                    sh 'terraform fmt -check -recursive'
                }
            }
        }
        
        stage('Terraform Plan') {
            steps {
                dir('terraform') {
                    sh 'terraform plan -out=tfplan'
                    sh 'terraform show -no-color tfplan > tfplan.txt'
                    
                    // Archive plan for review
                    archiveArtifacts artifacts: 'tfplan,tfplan.txt'
                }
            }
        }
        
        stage('Terraform Apply') {
            when {
                branch 'main'
            }
            steps {
                dir('terraform') {
                    input message: 'Apply Terraform changes?', ok: 'Apply'
                    
                    withCredentials([
                        aws(credentialsId: 'aws-credentials')
                    ]) {
                        sh 'terraform apply -auto-approve tfplan'
                    }
                }
            }
        }
    }
    
    post {
        always {
            dir('terraform') {
                // Archive Terraform logs
                archiveArtifacts artifacts: '*.log', allowEmptyArchive: true
            }
            cleanWs()
        }
        
        success {
            echo 'Terraform pipeline succeeded!'
        }
        
        failure {
            echo 'Terraform pipeline failed!'
        }
    }
}
```

### Advanced Terraform Pipeline with Multiple Environments

```groovy
pipeline {
    agent any
    
    parameters {
        choice(
            name: 'ENVIRONMENT',
            choices: ['dev', 'staging', 'prod'],
            description: 'Target environment'
        )
        
        choice(
            name: 'ACTION',
            choices: ['plan', 'apply', 'destroy'],
            description: 'Terraform action'
        )
    }
    
    environment {
        AWS_DEFAULT_REGION = 'us-east-1'
        TF_IN_AUTOMATION = 'true'
        TF_WORKSPACE = "${params.ENVIRONMENT}"
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Setup Terraform') {
            steps {
                script {
                    // Install specific Terraform version
                    sh '''
                        TF_VERSION=1.6.0
                        wget https://releases.hashicorp.com/terraform/${TF_VERSION}/terraform_${TF_VERSION}_linux_amd64.zip
                        unzip -o terraform_${TF_VERSION}_linux_amd64.zip
                        chmod +x terraform
                        ./terraform version
                    '''
                }
            }
        }
        
        stage('Terraform Init') {
            steps {
                dir('terraform') {
                    withCredentials([
                        aws(credentialsId: 'aws-credentials')
                    ]) {
                        sh '''
                            ../terraform init \
                                -backend-config="bucket=my-terraform-state" \
                                -backend-config="key=${ENVIRONMENT}/terraform.tfstate" \
                                -backend-config="region=${AWS_DEFAULT_REGION}" \
                                -backend-config="dynamodb_table=terraform-locks"
                        '''
                    }
                }
            }
        }
        
        stage('Terraform Workspace') {
            steps {
                dir('terraform') {
                    sh '''
                        ../terraform workspace select ${TF_WORKSPACE} || \
                        ../terraform workspace new ${TF_WORKSPACE}
                    '''
                }
            }
        }
        
        stage('Terraform Validate') {
            steps {
                dir('terraform') {
                    sh '../terraform validate'
                }
            }
        }
        
        stage('Terraform Plan') {
            when {
                expression { params.ACTION == 'plan' || params.ACTION == 'apply' }
            }
            steps {
                dir('terraform') {
                    withCredentials([
                        aws(credentialsId: 'aws-credentials')
                    ]) {
                        sh '''
                            ../terraform plan \
                                -var-file="environments/${ENVIRONMENT}.tfvars" \
                                -out=tfplan
                        '''
                        
                        sh '../terraform show -no-color tfplan > tfplan.txt'
                    }
                    
                    archiveArtifacts artifacts: 'tfplan,tfplan.txt'
                }
            }
        }
        
        stage('Terraform Apply') {
            when {
                expression { params.ACTION == 'apply' }
            }
            steps {
                dir('terraform') {
                    script {
                        if (params.ENVIRONMENT == 'prod') {
                            input message: 'Apply to production?', ok: 'Apply'
                        }
                    }
                    
                    withCredentials([
                        aws(credentialsId: 'aws-credentials')
                    ]) {
                        sh '../terraform apply -auto-approve tfplan'
                    }
                }
            }
        }
        
        stage('Terraform Destroy') {
            when {
                expression { params.ACTION == 'destroy' }
            }
            steps {
                dir('terraform') {
                    input message: "Destroy ${params.ENVIRONMENT}?", ok: 'Destroy'
                    
                    withCredentials([
                        aws(credentialsId: 'aws-credentials')
                    ]) {
                        sh '''
                            ../terraform destroy \
                                -var-file="environments/${ENVIRONMENT}.tfvars" \
                                -auto-approve
                        '''
                    }
                }
            }
        }
        
        stage('Test Infrastructure') {
            when {
                expression { params.ACTION == 'apply' }
            }
            steps {
                script {
                    sh '''
                        python3 tests/infrastructure_tests.py \
                            --environment ${ENVIRONMENT}
                    '''
                }
            }
        }
    }
    
    post {
        always {
            dir('terraform') {
                archiveArtifacts artifacts: '*.log,*.txt', allowEmptyArchive: true
            }
        }
        
        success {
            script {
                def message = "Terraform ${params.ACTION} succeeded for ${params.ENVIRONMENT}"
                echo message
                
                // Send notification (Slack, email, etc.)
                // slackSend color: 'good', message: message
            }
        }
        
        failure {
            script {
                def message = "Terraform ${params.ACTION} failed for ${params.ENVIRONMENT}"
                echo message
                
                // Send notification
                // slackSend color: 'danger', message: message
            }
        }
    }
}
```

### Terraform with Cost Estimation

```groovy
stage('Terraform Cost Estimation') {
    steps {
        dir('terraform') {
            sh '''
                # Using Infracost
                infracost breakdown \
                    --path . \
                    --terraform-plan-flags "-var-file=environments/${ENVIRONMENT}.tfvars"
            '''
        }
    }
}
```

---

## AWS Integration

### Using AWS Credentials

```groovy
pipeline {
    agent any
    
    stages {
        stage('AWS Operations') {
            steps {
                // Method 1: Using withCredentials
                withCredentials([
                    aws(credentialsId: 'aws-credentials')
                ]) {
                    sh 'aws s3 ls'
                    sh 'aws ec2 describe-vpcs'
                }
                
                // Method 2: Using explicit credentials
                withCredentials([
                    string(credentialsId: 'aws-access-key', variable: 'AWS_ACCESS_KEY_ID'),
                    string(credentialsId: 'aws-secret-key', variable: 'AWS_SECRET_ACCESS_KEY')
                ]) {
                    sh 'aws s3 ls'
                }
                
                // Method 3: Assume IAM role
                withAWS(role: 'JenkinsDeploymentRole', roleAccount: '123456789012') {
                    sh 'aws sts get-caller-identity'
                    sh 'terraform apply'
                }
            }
        }
    }
}
```

### Deploy to AWS

```groovy
pipeline {
    agent any
    
    environment {
        AWS_REGION = 'us-east-1'
        ECR_REPO = '123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp'
        ECS_CLUSTER = 'production-cluster'
        ECS_SERVICE = 'myapp-service'
    }
    
    stages {
        stage('Build Docker Image') {
            steps {
                sh 'docker build -t myapp:${BUILD_NUMBER} .'
            }
        }
        
        stage('Push to ECR') {
            steps {
                withAWS(credentials: 'aws-credentials', region: env.AWS_REGION) {
                    sh '''
                        # Login to ECR
                        aws ecr get-login-password --region ${AWS_REGION} | \
                            docker login --username AWS --password-stdin ${ECR_REPO}
                        
                        # Tag image
                        docker tag myapp:${BUILD_NUMBER} ${ECR_REPO}:${BUILD_NUMBER}
                        docker tag myapp:${BUILD_NUMBER} ${ECR_REPO}:latest
                        
                        # Push image
                        docker push ${ECR_REPO}:${BUILD_NUMBER}
                        docker push ${ECR_REPO}:latest
                    '''
                }
            }
        }
        
        stage('Update ECS Service') {
            steps {
                withAWS(credentials: 'aws-credentials', region: env.AWS_REGION) {
                    sh '''
                        # Update task definition
                        aws ecs update-service \
                            --cluster ${ECS_CLUSTER} \
                            --service ${ECS_SERVICE} \
                            --force-new-deployment
                        
                        # Wait for deployment
                        aws ecs wait services-stable \
                            --cluster ${ECS_CLUSTER} \
                            --services ${ECS_SERVICE}
                    '''
                }
            }
        }
    }
}
```

---

## Best Practices

### 1. Pipeline Organization

```
project/
├── Jenkinsfile                 # Main pipeline
├── jenkins/
│   ├── Jenkinsfile.dev        # Dev pipeline
│   ├── Jenkinsfile.prod       # Prod pipeline
│   └── shared/                # Shared library
│       ├── vars/
│       │   ├── deployToAWS.groovy
│       │   └── terraformPipeline.groovy
│       └── resources/
└── terraform/
    ├── environments/
    │   ├── dev.tfvars
    │   └── prod.tfvars
    └── modules/
```

### 2. Shared Pipeline Libraries

**`vars/terraformPipeline.groovy`:**
```groovy
def call(Map config) {
    pipeline {
        agent any
        
        environment {
            TF_IN_AUTOMATION = 'true'
            AWS_REGION = config.region ?: 'us-east-1'
        }
        
        stages {
            stage('Terraform Init') {
                steps {
                    dir(config.directory) {
                        sh 'terraform init'
                    }
                }
            }
            
            stage('Terraform Plan') {
                steps {
                    dir(config.directory) {
                        sh "terraform plan -var-file=${config.varFile} -out=tfplan"
                    }
                }
            }
            
            stage('Terraform Apply') {
                when {
                    expression { config.autoApply == true }
                }
                steps {
                    dir(config.directory) {
                        sh 'terraform apply -auto-approve tfplan'
                    }
                }
            }
        }
    }
}
```

**Usage in Jenkinsfile:**
```groovy
@Library('shared-pipeline-library') _

terraformPipeline(
    directory: 'terraform',
    varFile: 'environments/prod.tfvars',
    region: 'us-east-1',
    autoApply: false
)
```

### 3. Credentials Management

```groovy
pipeline {
    agent any
    
    stages {
        stage('Deploy') {
            steps {
                // AWS credentials
                withCredentials([
                    aws(credentialsId: 'aws-prod-credentials')
                ]) {
                    sh 'aws s3 sync ./build s3://my-bucket'
                }
                
                // SSH key
                sshagent(['github-ssh-key']) {
                    sh 'git clone git@github.com:org/repo.git'
                }
                
                // Username/password
                withCredentials([
                    usernamePassword(
                        credentialsId: 'docker-hub',
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_PASS'
                    )
                ]) {
                    sh 'echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin'
                }
                
                // Secret text
                withCredentials([
                    string(credentialsId: 'api-token', variable: 'API_TOKEN')
                ]) {
                    sh 'curl -H "Authorization: Bearer $API_TOKEN" https://api.example.com'
                }
            }
        }
    }
}
```

### 4. Error Handling

```groovy
pipeline {
    agent any
    
    stages {
        stage('Deploy') {
            steps {
                script {
                    try {
                        sh 'terraform apply -auto-approve'
                    } catch (Exception e) {
                        echo "Terraform apply failed: ${e.getMessage()}"
                        
                        // Attempt rollback
                        try {
                            sh 'terraform apply -auto-approve -target=previous_state'
                        } catch (Exception rollbackError) {
                            echo "Rollback failed: ${rollbackError.getMessage()}"
                        }
                        
                        throw e
                    }
                }
            }
        }
    }
    
    post {
        failure {
            script {
                // Send notification
                emailext(
                    subject: "Pipeline Failed: ${env.JOB_NAME}",
                    body: "Build ${env.BUILD_NUMBER} failed. Check console output.",
                    to: 'team@example.com'
                )
            }
        }
    }
}
```

### 5. Multi-Branch Pipeline

```groovy
// Jenkinsfile for multi-branch pipeline
pipeline {
    agent any
    
    stages {
        stage('Build') {
            steps {
                sh 'make build'
            }
        }
        
        stage('Test') {
            steps {
                sh 'make test'
            }
        }
        
        stage('Deploy to Dev') {
            when {
                branch 'develop'
            }
            steps {
                echo 'Deploying to dev...'
                sh 'make deploy-dev'
            }
        }
        
        stage('Deploy to Staging') {
            when {
                branch 'staging'
            }
            steps {
                echo 'Deploying to staging...'
                sh 'make deploy-staging'
            }
        }
        
        stage('Deploy to Production') {
            when {
                allOf {
                    branch 'main'
                    expression { env.CHANGE_ID == null } // Not a PR
                }
            }
            steps {
                input message: 'Deploy to production?', ok: 'Deploy'
                echo 'Deploying to production...'
                sh 'make deploy-prod'
            }
        }
        
        stage('PR Validation') {
            when {
                expression { env.CHANGE_ID != null } // Is a PR
            }
            steps {
                echo "Validating PR #${env.CHANGE_ID}"
                sh 'make validate'
            }
        }
    }
}
```

---

## Interview Questions

### Q1: What's the difference between declarative and scripted pipelines?

**Answer:**

**Declarative Pipeline:**
- Simpler, more structured syntax
- Predefined structure (pipeline → agent → stages → steps)
- Better for most use cases
- Easier to read and maintain
- Limited flexibility

```groovy
pipeline {
    agent any
    stages {
        stage('Build') {
            steps {
                sh 'make build'
            }
        }
    }
}
```

**Scripted Pipeline:**
- Groovy-based, more flexible
- Full programming capabilities
- More complex
- Use when you need advanced control flow

```groovy
node {
    stage('Build') {
        sh 'make build'
    }
}
```

**When to use:**
- **Declarative**: 90% of pipelines (recommended)
- **Scripted**: Complex logic, dynamic stages, advanced control

### Q2: How do you handle secrets in Jenkins pipelines?

**Answer:**

**❌ Never do this:**
```groovy
environment {
    AWS_SECRET = "AKIAIOSFODNN7EXAMPLE"  // NEVER hardcode
}
```

**✅ Use Jenkins Credentials:**

**1. Store in Jenkins:**
- Manage Jenkins → Manage Credentials
- Add credentials with unique ID

**2. Use in pipeline:**
```groovy
withCredentials([
    aws(credentialsId: 'aws-prod-creds')
]) {
    sh 'aws s3 ls'
}

// Or string credentials
withCredentials([
    string(credentialsId: 'api-token', variable: 'TOKEN')
]) {
    sh 'curl -H "Authorization: Bearer $TOKEN" api.example.com'
}
```

**3. Mask secrets in logs:**
```groovy
wrap([$class: 'MaskPasswordsBuildWrapper']) {
    sh 'echo $SECRET_PASSWORD'  // Will show ****
}
```

**Best practices:**
- Use AWS Secrets Manager/Parameter Store
- Rotate credentials regularly
- Limit credential access to specific pipelines
- Never print secrets to logs

### Q3: How would you implement a rollback strategy in Jenkins?

**Answer:**

```groovy
pipeline {
    agent any
    
    environment {
        CURRENT_VERSION = sh(
            script: 'aws ecs describe-services --cluster prod --services myapp --query "services[0].taskDefinition" --output text',
            returnStdout: true
        ).trim()
    }
    
    stages {
        stage('Deploy') {
            steps {
                script {
                    try {
                        sh '''
                            aws ecs update-service \
                                --cluster prod \
                                --service myapp \
                                --task-definition myapp:${BUILD_NUMBER}
                        '''
                        
                        // Wait for deployment
                        sh 'aws ecs wait services-stable --cluster prod --services myapp'
                        
                        // Health check
                        def health = sh(
                            script: 'curl -f http://myapp.example.com/health',
                            returnStatus: true
                        )
                        
                        if (health != 0) {
                            throw new Exception("Health check failed")
                        }
                        
                    } catch (Exception e) {
                        echo "Deployment failed: ${e.getMessage()}"
                        echo "Rolling back to ${CURRENT_VERSION}"
                        
                        // Rollback
                        sh """
                            aws ecs update-service \
                                --cluster prod \
                                --service myapp \
                                --task-definition ${CURRENT_VERSION}
                        """
                        
                        sh 'aws ecs wait services-stable --cluster prod --services myapp'
                        
                        throw e
                    }
                }
            }
        }
    }
}
```

**Strategies:**
1. **Blue-Green**: Deploy to new environment, switch traffic
2. **Canary**: Gradually shift traffic
3. **Rolling**: Update instances one by one
4. **Immediate Rollback**: Revert to previous version on failure

### Q4: How do you test infrastructure changes before applying?

**Answer:**

**1. Terraform Plan in PR:**
```groovy
stage('Terraform Plan on PR') {
    when {
        changeRequest()
    }
    steps {
        sh 'terraform plan -out=tfplan'
        sh 'terraform show -no-color tfplan > tfplan.txt'
        
        // Post plan as PR comment
        publishTerraformPlan(
            planFile: 'tfplan.txt',
            credentialsId: 'github-token'
        )
    }
}
```

**2. Infrastructure Tests:**
```groovy
stage('Test Infrastructure') {
    steps {
        sh '''
            # Terraform validate
            terraform validate
            
            # tflint
            tflint
            
            # Checkov (security)
            checkov -d .
            
            # Custom tests
            python tests/infrastructure_tests.py
        '''
    }
}
```

**3. Deploy to Test Environment First:**
```groovy
stage('Deploy to Test') {
    steps {
        sh 'terraform workspace select test'
        sh 'terraform apply -auto-approve'
        
        // Run integration tests
        sh 'pytest tests/integration'
    }
}

stage('Deploy to Prod') {
    when {
        branch 'main'
    }
    steps {
        input 'Deploy to prod?'
        sh 'terraform workspace select prod'
        sh 'terraform apply -auto-approve'
    }
}
```

### Q5: How would you optimize Jenkins pipeline performance?

**Answer:**

**1. Parallel Stages:**
```groovy
stage('Tests') {
    parallel {
        stage('Unit') { steps { sh 'pytest tests/unit' } }
        stage('Integration') { steps { sh 'pytest tests/integration' } }
        stage('Security') { steps { sh 'bandit -r src/' } }
    }
}
```

**2. Caching:**
```groovy
// Cache dependencies
stage('Install Dependencies') {
    steps {
        script {
            if (!fileExists('.venv')) {
                sh 'python -m venv .venv'
                sh '.venv/bin/pip install -r requirements.txt'
            }
        }
    }
}
```

**3. Distributed Builds:**
```groovy
// Use specific agents
stage('Build') {
    agent { label 'high-cpu' }
    steps { sh 'make build' }
}
```

**4. Workspace Cleanup:**
```groovy
post {
    always {
        cleanWs()  // Clean workspace after build
    }
}
```

**5. Skip Unnecessary Stages:**
```groovy
stage('Deploy') {
    when {
        anyOf {
            branch 'main'
            changeRequest target: 'main'
        }
    }
    steps { sh 'make deploy' }
}
```

---

**Next Module:** [API Development with FastAPI](04_API_DEVELOPMENT.md)  
**Previous Module:** [Python + boto3](02_PYTHON_BOTO3.md)  
**Back to Plan:** [INTERVIEW_PREP_PLAN.md](INTERVIEW_PREP_PLAN.md)
