package br.com.lucasbellucci.dailyplanner.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Manda quem abre a raiz do site direto para a agenda de hoje.
 */
@Controller
public class RaizController {

    @GetMapping("/")
    public String raiz() {
        return "redirect:/agenda";
    }
}
