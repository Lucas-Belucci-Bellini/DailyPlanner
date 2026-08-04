package br.com.lucasbellucci.dailyplanner.web;

import br.com.lucasbellucci.dailyplanner.model.Horario;
import br.com.lucasbellucci.dailyplanner.repository.HorarioRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/horarios")
@CrossOrigin(origins = "*")
public class HorarioRestController {

    private final HorarioRepository repository;

    public HorarioRestController(HorarioRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Horario> listar() {
        return repository.findAll();
    }

    @PostMapping
    public Horario criar(@RequestBody Horario horario) {
        return repository.save(horario);
    }
}
