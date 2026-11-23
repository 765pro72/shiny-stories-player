#include <jni.h>
#include <node.h>
#include <unistd.h>
#include <android/log.h>
#include <pthread.h>
#include <vector>
#include <string>
#include <cstring>
static int pipes_[2];
static void* logging(void*) { char b[2048]; ssize_t n; while((n=read(pipes_[0],b,sizeof(b)-1))>0){b[n]=0;__android_log_write(ANDROID_LOG_INFO,"ShinyNode",b);}return nullptr; }
extern "C" JNIEXPORT jint JNICALL Java_io_shinystories_player_MainActivity_startNode(JNIEnv* env,jclass,jobjectArray input) {
 if(pipe(pipes_)==0){dup2(pipes_[1],STDOUT_FILENO);dup2(pipes_[1],STDERR_FILENO);pthread_t t;pthread_create(&t,nullptr,logging,nullptr);pthread_detach(t);}
 int count=env->GetArrayLength(input);std::vector<std::string> values;size_t length=0;
 for(int i=0;i<count;i++){auto value=(jstring)env->GetObjectArrayElement(input,i);auto bytes=env->GetStringUTFChars(value,nullptr);values.emplace_back(bytes);length+=strlen(bytes)+1;env->ReleaseStringUTFChars(value,bytes);env->DeleteLocalRef(value);}
 std::vector<char> storage(length);std::vector<char*> argv;size_t at=0;for(auto& v:values){argv.push_back(storage.data()+at);memcpy(storage.data()+at,v.c_str(),v.size()+1);at+=v.size()+1;}
 return node::Start(count,argv.data());
}
