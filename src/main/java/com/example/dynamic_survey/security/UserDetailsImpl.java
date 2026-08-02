package com.example.dynamic_survey.security;

import java.util.Collection;
import java.util.List;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import com.example.dynamic_survey.entity.User;
import com.fasterxml.jackson.annotation.JsonIgnore;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UserDetailsImpl implements UserDetails{
    private Long id;
    private String email;
    private String name;
    @JsonIgnore private String password;
    private Collection<? extends GrantedAuthority> authorities;

    public static UserDetailsImpl build(User user){
        List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_"+user.getRole()));
        return new UserDetailsImpl(user.getId(), user.getEmail(), user.getName(), user.getPassword(), authorities);
    }

    @Override public String getUsername(){return email;}

    @Override public boolean isAccountNonExpired() {return true;}
    @Override public boolean isAccountNonLocked() {return true;}
    @Override public boolean isCredentialsNonExpired() {return true;}
    @Override public boolean isEnabled() {return true;}
}
