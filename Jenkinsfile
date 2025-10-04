// File: Jenkinsfile
// Description: CI/CD pipeline with Docker build/push, Kubernetes deploy, and post actions (auto-downloads kubectl)

pipeline {
    agent any
    options { timestamps() }

    environment {
        // Image coords (fixed tag; no build-time in tag)
        IMAGE_NAME = 'ksanthosh200/swe645-site'
        IMAGE_TAG  = '1.0'
    }

    stages {
        stage("Build Survey Image") {
            steps {
                script {
                    checkout scm
                    sh 'echo "Building image: ${IMAGE_NAME}:${IMAGE_TAG}"'

                    withCredentials([usernamePassword(
                        credentialsId: 'docker-credentials',
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_PASS'
                    )]) {
                        sh '''
                          set -euo pipefail
                          docker logout || true
                          echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin

                          # Build & tag
                          docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .
                          docker tag  ${IMAGE_NAME}:${IMAGE_TAG} ${IMAGE_NAME}:latest
                        '''
                    }
                }
            }
        }

        stage("Push image to docker hub") {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'docker-credentials',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh '''
                      set -euo pipefail
                      echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                      docker push ${IMAGE_NAME}:${IMAGE_TAG}
                      docker push ${IMAGE_NAME}:latest
                    '''
                }
            }
        }

        // NEW: download kubectl into the workspace if missing
        stage("Prepare kubectl") {
            steps {
                sh '''
                  set -euo pipefail
                  mkdir -p .bin
                  if [ ! -x .bin/kubectl ]; then
                    echo "kubectl not found; downloading to .bin/ ..."
                    VER="$(curl -Ls https://dl.k8s.io/release/stable.txt)"
                    curl -L -o .bin/kubectl "https://dl.k8s.io/release/${VER}/bin/linux/amd64/kubectl"
                    chmod +x .bin/kubectl
                  fi
                  ./.bin/kubectl version --client --output=yaml || true
                '''
            }
        }

        stage("Deploy to kubernetes") {
            environment {
                // Prepend local kubectl for this stage
                PATH = "${env.WORKSPACE}/.bin:${env.PATH}"
            }
            steps {
                withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG_FILE')]) {
                    sh '''
                      set -euo pipefail
                      export KUBECONFIG="$KUBECONFIG_FILE"

                      # (Optional) sanity info
                      kubectl version --client=true --output=yaml || true
                      kubectl config current-context || true

                      NS="$(kubectl config view --minify -o jsonpath='{..namespace}' || true)"
                      [ -z "$NS" ] && NS=default
                      echo "Using namespace: $NS"

                      # Update Deployment/Container (change names if yours differ)
                      kubectl set image deployment/deployment container-0=${IMAGE_NAME}:${IMAGE_TAG} -n "$NS"
                      kubectl rollout status deployment/deployment -n "$NS" --timeout=180s
                      kubectl get pods -n "$NS" -o wide
                    '''
                }
            }
        }
    }

    post {
        always {
            sh 'docker logout || true'
            echo 'Cleaning Up ...'
        }
        success {
            echo 'Deployment Successful!'
        }
        failure {
            echo 'Deployment Failed.'
        }
    }
}
