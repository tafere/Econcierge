package com.econcierge.config;

import com.econcierge.repository.StaffRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtUtil jwtUtil;
    private final StaffRepository staffRepository;

    public SecurityConfig(JwtUtil jwtUtil, StaffRepository staffRepository) {
        this.jwtUtil = jwtUtil;
        this.staffRepository = staffRepository;
    }

    @Bean
    public PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/guest/**").permitAll()
                .requestMatchers("/api/schedule/**").permitAll()
                .requestMatchers("/api/auth/login").permitAll()
                .requestMatchers("/api/super/**").hasRole("SUPER_ADMIN")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter(), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    private OncePerRequestFilter jwtFilter() {
        return new OncePerRequestFilter() {
            @Override
            protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
                    throws IOException, jakarta.servlet.ServletException {
                String header = req.getHeader("Authorization");
                if (header != null && header.startsWith("Bearer ")) {
                    String token = header.substring(7);
                    if (jwtUtil.isValid(token)) {
                        String username = jwtUtil.extractUsername(token);
                        List<String> roles = jwtUtil.extractRoles(token);
                        staffRepository.findByUsername(username).ifPresent(staff -> {
                            if (staff.isEnabled()) {
                                List<SimpleGrantedAuthority> authorities = roles.stream()
                                        .map(r -> new SimpleGrantedAuthority("ROLE_" + r))
                                        .collect(Collectors.toList());
                                var auth = new UsernamePasswordAuthenticationToken(username, null, authorities);
                                SecurityContextHolder.getContext().setAuthentication(auth);
                            }
                        });
                    }
                }
                chain.doFilter(req, res);
            }
        };
    }
}
