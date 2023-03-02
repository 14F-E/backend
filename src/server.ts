import App from "./app";
import AuthenticationController from "./authentication/authentication.controller";
// import PostController from "./post/post.controller";
// import RecipeController from "./recipe/recipe.controller";
// import ReportController from "./report/report.controller";
import OrderController from "./order/order.controller";
import UserController from "./user/user.controller";

new App([new AuthenticationController(), new UserController(), new OrderController()]);
