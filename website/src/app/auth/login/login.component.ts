import {Component, OnInit} from '@angular/core';
import {NavigationExtras, Router} from '@angular/router';
import {AuthService} from '../auth.service';
import {FormBuilder} from '@angular/forms';
import {LoaderService} from '../../loader.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm = this.formBuilder.group({
    username: '',
    password: ''
  });
  loginState = {
    message: '',
    showProgress: false,
    showPassword: false,
  };

  constructor(public router: Router, public authService: AuthService,
              public loaderService: LoaderService,
              private formBuilder: FormBuilder) {
  }

  ngOnInit(): void {
    this.loaderService.loaderState.subscribe((show) => {
      this.loginState.showProgress = show;
    });
  }

  login(): void {
    this.loginState.message = '';
    const username = this.loginForm.value.username;
    const password = this.loginForm.value.password;

    this.authService.login(username, password).subscribe((auth) => {
      if (auth.success && this.authService.isLoggedIn()) {
        // Set our navigation extras object
        // that passes on our global query params and fragment
        const navigationExtras: NavigationExtras = {};

        // Redirect the user
        this.router.navigate([auth.redirect], navigationExtras);
      } else {
        this.loginState.message = 'Login Failed!';
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
