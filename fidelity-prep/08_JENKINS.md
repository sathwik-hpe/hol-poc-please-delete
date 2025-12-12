# Jenkins CI/CD Pipelines 🚀

## Critical for Fidelity
Job requires **"Jenkins for CI/CD"** - This is how you'll deploy infrastructure!

---

## 1. Jenkinsfile (Pipeline as Code)

### Declarative Pipeline

```groovy
pipeline {
    agent any
    
    environment {
        AWS_REGION = 'us-east-1'
        TF_VERSION = '1.6.0'
    }
    
    stages {
        stage('Checkout') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/org/infrastructure.git'
            }
        }
        
        stage('Terraform Init') {
            steps {
                sh '''
                    cd terraform/
                    terraform init \
                        -backend-config="bucket=my-tf-state" \
                        -backend-config="key=${ENV_NAME}/terraform.tfstate"
                '''
            }
        }
        
        stage('Terraform Plan') {
            steps {
                sh '''
                    cd terraform/
                    terraform plan -out=tfplan
                '''
            }
        }
        
        stage('Approval') {
            when {
                branch 'main'
            }
            steps {
                input message: 'Apply Terraform changes?',
                      ok: 'Deploy'
            }
        }
        
        stage('Terraform Apply') {
            when {
                branch 'main'
            }
            steps {
                sh '''
                    cd terraform/
                    terraform apply tfplan
                '''
            }
        }
    }
    
    post {
        success {
            echo 'Infrastructure deployment successful!'
            // Notify Slack, email, etc.
        }
        failure {
            echo 'Deployment failed!'
            // Send alerts
        }
        always {
            cleanWs()  // Clean workspace
        }
    }
}
```

---

## 2. Infrastructure Validation Pipeline

```groovy
pipeline {
    agent any
    
    stages {
        stage('Terraform Validate') {
            steps {
                sh 'terraform validate'
            }
        }
        
        stage('Terraform Format Check') {
            steps {
                sh '''
                    terraform fmt -check -recursive
                    if [ $? -ne 0 ]; then
                        echo "Code not formatted! Run: terraform fmt -recursive"
                        exit 1
                    fi
                '''
            }
        }
        
        stage('TFLint') {
            steps {
                sh '''
                    tflint --init
                    tflint
                '''
            }
        }
        
        stage('Checkov Security Scan') {
            steps {
                sh '''
                    checkov -d . \
                        --framework terraform \
                        --output junitxml > checkov-report.xml
                '''
            }
        }
        
        stage('Cost Estimation') {
            steps {
                sh '''
                    infracost breakdown \
                        --path . \
                        --format json \
                        --out-file infracost.json
                '''
            }
        }
    }
}
```

---

## 3. Multi-Environment Pipeline

```groovy
pipeline {
    agent any
    
    parameters {
        choice(
            name: 'ENVIRONMENT',
            choices: ['dev', 'staging', 'production'],
            description: 'Target environment'
        )
        booleanParam(
            name: 'DESTROY',
            defaultValue: false,
            description: 'Destroy infrastructure?'
        )
    }
    
    stages {
        stage('Setup') {
            steps {
                script {
                    // Set workspace based on environment
                    sh "terraform workspace select ${params.ENVIRONMENT} || terraform workspace new ${params.ENVIRONMENT}"
                }
            }
        }
        
        stage('Plan') {
            steps {
                script {
                    if (params.DESTROY) {
                        sh 'terraform plan -destroy -out=tfplan'
                    } else {
                        sh 'terraform plan -out=tfplan'
                    }
                }
            }
        }
        
        stage('Apply') {
            when {
                expression {
                    // Require approval for production
                    return params.ENVIRONMENT == 'production'
                }
            }
            steps {
                input message: "Deploy to ${params.ENVIRONMENT}?",
                      ok: 'Deploy'
                sh 'terraform apply tfplan'
            }
        }
    }
}
```

---

## 4. Shared Library (Reusable Functions)

**vars/terraform.groovy:**
```groovy
def validate() {
    sh 'terraform validate'
    sh 'terraform fmt -check'
}

def plan(String environment) {
    sh """
        terraform workspace select ${environment}
        terraform plan -out=tfplan
    """
}

def apply() {
    sh 'terraform apply tfplan'
}

def destroy(String environment) {
    sh """
        terraform workspace select ${environment}
        terraform destroy -auto-approve
    """
}
```

**Jenkinsfile using shared library:**
```groovy
@Library('shared-pipeline-library') _

pipeline {
    agent any
    
    stages {
        stage('Validate') {
            steps {
                terraform.validate()
            }
        }
        
        stage('Plan') {
            steps {
                terraform.plan('production')
            }
        }
        
        stage('Apply') {
            steps {
                terraform.apply()
            }
        }
    }
}
```

---

## 5. Parallel Execution

```groovy
pipeline {
    agent any
    
    stages {
        stage('Parallel Validation') {
            parallel {
                stage('Terraform Validate') {
                    steps {
                        sh 'terraform validate'
                    }
                }
                
                stage('Security Scan') {
                    steps {
                        sh 'checkov -d .'
                    }
                }
                
                stage('Lint') {
                    steps {
                        sh 'tflint'
                    }
                }
            }
        }
    }
}
```

---

## 6. Interview Questions

**Q: How do you handle secrets in Jenkins?**
```groovy
pipeline {
    environment {
        AWS_CREDENTIALS = credentials('aws-credentials-id')
    }
    
    stages {
        stage('Deploy') {
            steps {
                withAWS(credentials: 'aws-credentials-id', region: 'us-east-1') {
                    sh 'terraform apply'
                }
            }
        }
    }
}
```

**Q: How do you ensure infrastructure changes are reviewed?**
```
1. Pull request triggers Jenkins job
2. Jenkins runs: validate, plan, security scan
3. Post plan output as PR comment
4. Require approval from team
5. Merge triggers apply job
6. Production requires manual approval step
```

---

## Key Takeaways

✅ **Pipeline as Code**: Jenkinsfile in version control  
✅ **Validation**: Format, lint, security scans before apply  
✅ **Approval**: Manual approval for production  
✅ **Parallel**: Run independent checks concurrently  
✅ **Shared Libraries**: Reusable pipeline functions  

**Your HPE Advantage**: Jenkins experience - mention 900+ deployments!

**Next**: Networking Fundamentals
