## Multi-stage Dockerfile: build with Maven (JDK 21) and run slimmer JRE image
FROM maven:3.9.6-jdk-21 AS build
WORKDIR /app
COPY pom.xml mvnw ./
COPY .mvn .mvn
RUN mvn -B -f pom.xml -q -DskipTests dependency:go-offline
COPY src ./src
RUN mvn -B -f pom.xml -q -DskipTests package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
ENV JAVA_OPTS="-Djava.security.egd=file:/dev/./urandom"
EXPOSE 8080
ENTRYPOINT ["sh","-c","java $JAVA_OPTS -jar /app/app.jar"]
