package br.com.lucasbellucci.dailyplanner;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class DailyPlannerApplication {

    public static void main(String[] args) {
        SpringApplication.run(DailyPlannerApplication.class, args);
    }
}
